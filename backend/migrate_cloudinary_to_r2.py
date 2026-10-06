#!/usr/bin/env python3
"""
migrate_cloudinary_to_r2.py – Safe, idempotent migration of Cloudinary assets
to Cloudflare R2 for the DentaFlow dental-clinic application.

Usage (run steps in order):
    python migrate_cloudinary_to_r2.py --discover
    python migrate_cloudinary_to_r2.py --copy
    python migrate_cloudinary_to_r2.py --verify
    python migrate_cloudinary_to_r2.py --update-db --dry-run
    python migrate_cloudinary_to_r2.py --update-db
    python migrate_cloudinary_to_r2.py --rollback

Nothing is ever deleted from Cloudinary by this script.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import logging
import logging.handlers
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from dotenv import load_dotenv

# Load .env file
load_dotenv(Path(__file__).parent / ".env", override=True)

import boto3
import certifi
import cloudinary
import cloudinary.api
import cloudinary.utils
import pymongo
import requests
from botocore.exceptions import ClientError
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReplaceOne, UpdateOne

# Optional Pillow pipeline for variants
try:
    sys.path.insert(0, str(Path(__file__).parent))
    from image_pipeline import prepare_upload as _prepare_upload
    HAS_PIPELINE = True
except ImportError:
    HAS_PIPELINE = False

# ============================================================================
# Configuration & Environment Variables
# ============================================================================
MONGO_URL        = os.environ.get("MONGO_URL", "")
DB_NAME          = os.environ.get("DB_NAME", "dentaflow_db")
CLOUD_NAME       = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUD_KEY        = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUD_SECRET     = os.environ.get("CLOUDINARY_API_SECRET", "")
R2_ACCOUNT_ID    = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_KEY    = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET        = os.environ.get("R2_BUCKET", "")

LOCK_FILE        = Path(__file__).parent / "migration.lock"
MAP_FILE         = Path(__file__).parent / "migration_map.jsonl"
VERIFY_REPORT    = Path(__file__).parent / "verify_report.json"
BACKUP_DIR       = Path(__file__).parent / "db_backup"
BATCH_SIZE       = 100
CLOUDINARY_PAT   = "res.cloudinary.com"

# ============================================================================
# Safe Logging Setup (Rotating file + console, NO PII / Secrets)
# ============================================================================
log_dir = Path(__file__).parent / "log"
log_dir.mkdir(exist_ok=True)

logger = logging.getLogger("migrate")
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    fmt = logging.Formatter("%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    fh = logging.handlers.RotatingFileHandler(
        log_dir / "migration.log", maxBytes=5_000_000, backupCount=5, encoding="utf-8"
    )
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

# ============================================================================
# Lock Mechanism
# ============================================================================
def acquire_lock():
    if LOCK_FILE.exists():
        try:
            pid = LOCK_FILE.read_text(encoding="utf-8").strip()
            logger.error("Lock file exists (PID %s). Remove %s if stale.", pid, LOCK_FILE)
        except Exception:
            logger.error("Lock file exists at %s. Remove it if stale.", LOCK_FILE)
        sys.exit(1)
    LOCK_FILE.write_text(str(os.getpid()), encoding="utf-8")
    logger.info("Lock acquired (PID %s).", os.getpid())

def release_lock():
    try:
        LOCK_FILE.unlink(missing_ok=True)
        logger.info("Lock released.")
    except Exception:
        pass

# ============================================================================
# Masking helper for patient data & URLs
# ============================================================================
def mask_example(val: str) -> str:
    """Mask patient data/URLs for display to prevent exposing sensitive details."""
    if not val:
        return ""
    if len(val) > 35:
        return val[:16] + "...[MASKED]..." + val[-8:]
    return val[:5] + "***" + val[-3:]

# ============================================================================
# Shared Clients
# ============================================================================
_mongo_sync_client: Optional[pymongo.MongoClient] = None
_r2_client: Optional[boto3.client] = None

def get_mongo_db() -> pymongo.database.Database:
    global _mongo_sync_client
    if _mongo_sync_client is None:
        kw = {}
        if "mongodb+srv" in MONGO_URL or "tls=true" in MONGO_URL.lower():
            kw["tlsCAFile"] = certifi.where()
        _mongo_sync_client = pymongo.MongoClient(MONGO_URL, **kw)
    return _mongo_sync_client[DB_NAME]

def get_r2_client():
    global _r2_client
    if _r2_client is None:
        _r2_client = boto3.client(
            "s3",
            region_name="auto",
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_KEY,
        )
    return _r2_client

def init_cloudinary():
    cloudinary.config(
        cloud_name=CLOUD_NAME,
        api_key=CLOUD_KEY,
        api_secret=CLOUD_SECRET,
        secure=True,
    )

# ============================================================================
# Migration Map Persistence (JSONL file + Mongo collection)
# ============================================================================
def save_map_batch(entries: List[Dict[str, Any]]):
    """Append entries to migration_map.jsonl and upsert into Mongo migration_map collection."""
    if not entries:
        return
    with MAP_FILE.open("a", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False, default=str) + "\n")
    try:
        db = get_mongo_db()
        ops = [ReplaceOne({"public_id": e["public_id"]}, e, upsert=True) for e in entries if "public_id" in e]
        if ops:
            db.migration_map.bulk_write(ops, ordered=False)
    except Exception as exc:
        logger.warning("Could not sync migration map batch to MongoDB: %s", exc)

def load_map() -> Dict[str, Dict[str, Any]]:
    """Load migration_map.jsonl into memory (keyed by public_id)."""
    entries: Dict[str, Dict[str, Any]] = {}
    if MAP_FILE.exists():
        with MAP_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    if "public_id" in obj:
                        entries[obj["public_id"]] = obj
                except Exception:
                    continue
    return entries

# ============================================================================
# Public ID Extraction
# ============================================================================
def extract_public_id(val: str, known_pids: Optional[Set[str]] = None) -> Optional[str]:
    """Extract Cloudinary public_id from a URL or raw string."""
    if not isinstance(val, str) or not val.strip():
        return None
    val_str = val.strip()

    if known_pids and val_str in known_pids:
        return val_str

    if CLOUDINARY_PAT in val_str:
        m = re.search(r"/upload/(?:v\d+/)?(.+?)(?:\.\w+)?$", val_str)
        if m:
            return m.group(1)

    m2 = re.search(r"(dentaflow/[a-zA-Z0-9_-]+)", val_str)
    if m2:
        return m2.group(1)

    if known_pids:
        for k in known_pids:
            if k in val_str:
                return k

    return None

def walk_strings(obj: Any, path: str = "") -> List[Tuple[str, str]]:
    """Recursively yield (dotpath, string_value) for every string in a document."""
    results = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            results.extend(walk_strings(v, f"{path}.{k}" if path else k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            results.extend(walk_strings(v, f"{path}[{i}]"))
    elif isinstance(obj, str):
        results.append((path, obj))
    return results

# ============================================================================
# STEP 0: DISCOVERY (read-only)
# ============================================================================
def step_discover():
    logger.info("===== STEP 0: DISCOVERY (read-only) =====")
    init_cloudinary()

    # 1. Fetch all assets from Cloudinary Admin API
    logger.info("Fetching all assets from Cloudinary Admin API ...")
    assets: List[Dict[str, Any]] = []
    for rtype in ("image", "video", "raw"):
        cursor = None
        while True:
            try:
                resp = cloudinary.api.resources(resource_type=rtype, max_results=500, next_cursor=cursor)
                res_list = resp.get("resources", [])
                assets.extend(res_list)
                cursor = resp.get("next_cursor")
                if not cursor:
                    break
            except Exception as exc:
                logger.warning("Cloudinary Admin API call failed for %s: %s", rtype, exc)
                break

    cloud_assets_map = {a["public_id"]: a for a in assets}
    cloud_pids = set(cloud_assets_map.keys())
    logger.info("Cloudinary Admin API returned %d total assets.", len(assets))

    # 2. Scan every MongoDB collection and document
    db = get_mongo_db()
    coll_names = [c for c in db.list_collection_names() if c != "migration_map"]
    logger.info("Scanning %d MongoDB collections for Cloudinary references ...", len(coll_names))

    existing = load_map()
    batch: List[Dict[str, Any]] = []

    field_stats: Dict[Tuple[str, str], int] = {}  # (collection, field_path) -> count
    field_examples: Dict[Tuple[str, str], str] = {}
    db_found_pids: Set[str] = set()
    total_db_refs = 0

    for coll_name in coll_names:
        coll = db[coll_name]
        coll_ref_count = 0
        for doc in coll.find({}):
            doc_id = str(doc.get("id", doc.get("_id", "?")))
            for path, val in walk_strings(doc):
                pid = extract_public_id(val, cloud_pids)
                if not pid:
                    continue

                total_db_refs += 1
                coll_ref_count += 1
                db_found_pids.add(pid)

                key = (coll_name, path)
                field_stats[key] = field_stats.get(key, 0) + 1
                if key not in field_examples:
                    field_examples[key] = mask_example(val)

                # Record/enrich mapping entry
                c_asset = cloud_assets_map.get(pid, {})
                old_url = val if CLOUDINARY_PAT in val else c_asset.get("secure_url") or c_asset.get("url") or val

                entry = existing.get(pid, {})
                entry.update({
                    "public_id": pid,
                    "old_url": old_url,
                    "collection": coll_name,
                    "doc_id": doc_id,
                    "field_path": path,
                    "status": entry.get("status", "discovered"),
                    "resource_type": c_asset.get("resource_type", "image"),
                    "format": c_asset.get("format") or ("png" if ".png" in val else "jpg"),
                    "cloud_bytes": c_asset.get("bytes"),
                    "discovered_at": entry.get("discovered_at", datetime.now(timezone.utc).isoformat()),
                })
                existing[pid] = entry
                batch.append(entry)
                if len(batch) >= BATCH_SIZE:
                    save_map_batch(batch)
                    batch.clear()

        if coll_ref_count:
            logger.info("  Collection '%s': %d Cloudinary references found", coll_name, coll_ref_count)

    # 3. Check for Orphaned Cloudinary assets (in Cloudinary, not referenced in DB)
    orphan_count = 0
    for pid, c_asset in cloud_assets_map.items():
        if pid not in db_found_pids:
            orphan_count += 1
            if pid not in existing:
                entry = {
                    "public_id": pid,
                    "old_url": c_asset.get("secure_url") or c_asset.get("url", ""),
                    "status": "orphan",
                    "resource_type": c_asset.get("resource_type", "image"),
                    "format": c_asset.get("format", "jpg"),
                    "cloud_bytes": c_asset.get("bytes"),
                    "discovered_at": datetime.now(timezone.utc).isoformat(),
                }
                existing[pid] = entry
                batch.append(entry)
                if len(batch) >= BATCH_SIZE:
                    save_map_batch(batch)
                    batch.clear()

    if batch:
        save_map_batch(batch)

    # 4. Broken links: DB references whose public_id is not in Cloudinary Admin API
    broken_links = [pid for pid in db_found_pids if pid not in cloud_pids]

    # Print Discovery Report
    print("\n" + "=" * 70)
    print("  CLOUDINARY -> R2 DISCOVERY REPORT")
    print("=" * 70)
    print(f"  Collections Scanned         : {len(coll_names)}")
    print(f"  Total DB Cloudinary Refs    : {total_db_refs}")
    print(f"  Unique DB Public IDs        : {len(db_found_pids)}")
    print(f"  Cloudinary Admin Assets     : {len(assets)}")
    print(f"  Orphans (Cloudinary, no DB) : {orphan_count}")
    print(f"  Broken Links (DB, no Cloud) : {len(broken_links)}")
    print("-" * 70)
    print("  FIELD BREAKDOWN & MASKED EXAMPLES:")
    for (coll, path), count in field_stats.items():
        ex = field_examples.get((coll, path), "")
        print(f"   - {coll}.{path} (count: {count})")
        print(f"     Example: {ex}")
    if broken_links:
        print("-" * 70)
        print("  BROKEN LINKS SAMPLE:")
        for b in broken_links[:5]:
            print(f"   - {b}")
    print("=" * 70 + "\n")

    logger.info("Discovery complete. Total DB refs: %d, Cloud assets: %d, Orphans: %d, Broken: %d.",
                total_db_refs, len(assets), orphan_count, len(broken_links))

# ============================================================================
# STEP 1: COPY (idempotent, resumable, stream to R2)
# ============================================================================
def _download_stream(url: str, max_retries: int = 4) -> bytes:
    """Download file in bounded chunks with exponential backoff on HTTP 429/errors."""
    backoff = 2
    for attempt in range(1, max_retries + 1):
        try:
            with requests.get(url, stream=True, timeout=30) as r:
                if r.status_code == 429:
                    logger.warning("HTTP 429 Rate Limit from Cloudinary. Retrying in %ds...", backoff)
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                r.raise_for_status()
                chunks = []
                for chunk in r.iter_content(chunk_size=64 * 1024):
                    chunks.append(chunk)
                return b"".join(chunks)
        except Exception as exc:
            if attempt == max_retries:
                raise exc
            logger.warning("Download error (attempt %d/%d): %s. Retrying in %ds...", attempt, max_retries, exc, backoff)
            time.sleep(backoff)
            backoff *= 2
    raise RuntimeError(f"Failed to download from {url} after {max_retries} retries.")

def step_copy():
    logger.info("===== STEP 1: COPY (idempotent stream to R2) =====")
    init_cloudinary()
    entries = load_map()
    s3 = get_r2_client()

    to_copy = [e for e in entries.values() if e.get("status") in {"discovered", "orphan", "failed"}]
    logger.info("%d assets to copy.", len(to_copy))

    copied = skipped = failed = total_bytes = 0
    batch: List[Dict[str, Any]] = []

    for i, entry in enumerate(to_copy, 1):
        pid = entry["public_id"]
        fmt = entry.get("format") or "jpg"
        old_url = entry.get("old_url", "")
        doc_id = entry.get("doc_id")
        coll = entry.get("collection")

        # Determine download URL
        if old_url and CLOUDINARY_PAT in old_url:
            download_url = old_url.replace("http://", "https://")
        else:
            download_url = cloudinary.utils.cloudinary_url(pid, format=fmt, secure=True)[0]

        # Key scheme: patients/<id>/... if patient known, else migrated/<pid>.<fmt>
        clean_filename = pid.split("/")[-1]
        if not clean_filename.endswith(f".{fmt}"):
            clean_filename = f"{clean_filename}.{fmt}"

        if coll == "patients" and doc_id and doc_id != "?":
            r2_key = f"patients/{doc_id}/{clean_filename}"
        else:
            r2_key = f"migrated/{pid}.{fmt}"

        try:
            # Check if object already exists in R2 with matching size
            data = None
            try:
                head = s3.head_object(Bucket=R2_BUCKET, Key=r2_key)
                r2_size = head["ContentLength"]

                # If cloud_bytes matches, we can skip downloading unless sha256 missing
                if entry.get("bytes") == r2_size and entry.get("sha256"):
                    skipped += 1
                    entry.update({"status": "copied", "new_key": r2_key})
                    batch.append(entry)
                    if len(batch) >= BATCH_SIZE:
                        save_map_batch(batch); batch.clear()
                    continue
            except ClientError:
                pass  # Object not in R2 yet

            # Stream download from Cloudinary
            data = _download_stream(download_url)
            sha = hashlib.sha256(data).hexdigest()
            size = len(data)

            # Re-check head object size if it existed
            try:
                head = s3.head_object(Bucket=R2_BUCKET, Key=r2_key)
                if head["ContentLength"] == size:
                    skipped += 1
                    entry.update({"status": "copied", "new_key": r2_key, "bytes": size, "sha256": sha, "format": fmt})
                    batch.append(entry)
                    if len(batch) >= BATCH_SIZE:
                        save_map_batch(batch); batch.clear()
                    continue
            except ClientError:
                pass

            # Upload untouched original to R2
            ct = "image/jpeg" if fmt in ("jpg", "jpeg") else (f"image/{fmt}" if fmt in ("png", "webp", "gif") else "application/octet-stream")
            s3.upload_fileobj(io.BytesIO(data), R2_BUCKET, r2_key, ExtraArgs={"ContentType": ct})

            # Optional variant generation using image_pipeline if available
            variant_info = {}
            if HAS_PIPELINE and fmt in ("jpg", "jpeg", "png", "webp"):
                try:
                    pipeline_res = _prepare_upload(io.BytesIO(data), ct, kind="radiographs" if "radiograph" in r2_key else "clinical")
                    if pipeline_res.get("thumb"):
                        thumb_key = r2_key.rsplit(".", 1)[0] + "_thumb.webp"
                        s3.upload_fileobj(io.BytesIO(pipeline_res["thumb"]), R2_BUCKET, thumb_key, ExtraArgs={"ContentType": "image/webp"})
                        variant_info["thumb_key"] = thumb_key
                except Exception as var_exc:
                    logger.debug("Variant generation skipped for %s: %s", pid, var_exc)

            entry.update({
                "status": "copied",
                "new_key": r2_key,
                "bytes": size,
                "sha256": sha,
                "format": fmt,
                "copied_at": datetime.now(timezone.utc).isoformat(),
                **variant_info,
            })
            batch.append(entry)
            copied += 1
            total_bytes += size
            logger.info("[%d/%d] Copied %s -> %s (%d bytes)", i, len(to_copy), mask_example(pid), r2_key, size)

        except Exception as exc:
            failed += 1
            entry["status"] = "failed"
            entry["error"] = str(exc)[:200]
            batch.append(entry)
            logger.error("[%d/%d] FAILED %s: %s", i, len(to_copy), mask_example(pid), exc)

        if len(batch) >= BATCH_SIZE:
            save_map_batch(batch); batch.clear()

    if batch:
        save_map_batch(batch)

    print("\n" + "=" * 60)
    print("  COPY SUMMARY")
    print("=" * 60)
    print(f"  Copied      : {copied}")
    print(f"  Skipped     : {skipped}")
    print(f"  Failed      : {failed}")
    print(f"  Total Bytes : {total_bytes:,}")
    print("=" * 60 + "\n")

    logger.info("Copy complete. Copied: %d, Skipped: %d, Failed: %d, Bytes: %d.",
                copied, skipped, failed, total_bytes)

# ============================================================================
# STEP 2: VERIFY (Integrity check before DB update)
# ============================================================================
def step_verify():
    logger.info("===== STEP 2: VERIFY (R2 integrity check) =====")
    entries = load_map()
    s3 = get_r2_client()

    to_verify = [e for e in entries.values() if e.get("status") in {"copied", "verified"}]
    logger.info("%d assets to verify.", len(to_verify))

    report = []
    ok = mismatch = missing = 0
    batch: List[Dict[str, Any]] = []

    for i, entry in enumerate(to_verify, 1):
        pid = entry["public_id"]
        key = entry.get("new_key", "")
        expected_size = entry.get("bytes", 0)
        expected_sha = entry.get("sha256", "")

        try:
            head = s3.head_object(Bucket=R2_BUCKET, Key=key)
            r2_size = head["ContentLength"]
            size_ok = (r2_size == expected_size) if expected_size else True

            # Download R2 object to verify SHA256 hash
            obj = s3.get_object(Bucket=R2_BUCKET, Key=key)
            r2_data = obj["Body"].read()
            r2_sha = hashlib.sha256(r2_data).hexdigest()
            sha_ok = (r2_sha == expected_sha) if expected_sha else True

            if size_ok and sha_ok:
                entry["status"] = "verified"
                ok += 1
            else:
                entry["status"] = "mismatch"
                mismatch += 1
                logger.warning("MISMATCH for %s: size_ok=%s, sha_ok=%s", mask_example(pid), size_ok, sha_ok)

            report.append({
                "public_id": pid,
                "key": key,
                "size_ok": size_ok,
                "sha_ok": sha_ok,
                "expected_bytes": expected_size,
                "r2_bytes": r2_size,
                "status": entry["status"],
            })
        except ClientError:
            entry["status"] = "missing"
            missing += 1
            report.append({"public_id": pid, "key": key, "status": "missing"})
            logger.error("MISSING in R2: %s", key)
        except Exception as exc:
            entry["status"] = "verify_error"
            missing += 1
            logger.error("Verification error for %s: %s", mask_example(pid), exc)

        batch.append(entry)
        if len(batch) >= BATCH_SIZE:
            save_map_batch(batch); batch.clear()

    if batch:
        save_map_batch(batch)

    VERIFY_REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\n" + "=" * 60)
    print("  VERIFY REPORT")
    print("=" * 60)
    print(f"  Verified OK : {ok}")
    print(f"  Mismatch    : {mismatch}")
    print(f"  Missing     : {missing}")
    print(f"  Report File : {VERIFY_REPORT.name}")
    print("=" * 60 + "\n")

    if mismatch > 0 or missing > 0 or ok == 0:
        logger.error("VERIFICATION FAILED (mismatch=%d, missing=%d, ok=%d) – DO NOT PROCEED TO --update-db.",
                     mismatch, missing, ok)
        sys.exit(1)

    logger.info("Verification PASSED. All %d objects verified cleanly.", ok)

# ============================================================================
# STEP 3: DATABASE UPDATE (only after Step 2 passes)
# ============================================================================
def _backup_collections() -> bool:
    """Create a full backup of all collections to db_backup/ backup directory as JSON."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target_dir = BACKUP_DIR / f"backup_{ts}"
    target_dir.mkdir(parents=True, exist_ok=True)
    db = get_mongo_db()

    logger.info("Creating backup in %s ...", target_dir)
    coll_names = [c for c in db.list_collection_names() if c != "migration_map"]
    for coll_name in coll_names:
        docs = list(db[coll_name].find({}))
        if not docs:
            continue
        # Convert ObjectId & non-serializable fields
        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
        out_file = target_dir / f"{coll_name}.json"
        out_file.write_text(json.dumps(docs, indent=2, default=str), encoding="utf-8")
        logger.info("  Backed up %s (%d docs) -> %s", coll_name, len(docs), out_file.name)

    return True

def step_update_db(dry_run: bool):
    logger.info("===== STEP 3: DATABASE UPDATE %s =====", "(DRY RUN)" if dry_run else "")

    # Check if verification ran & passed
    if not VERIFY_REPORT.exists():
        logger.error("verify_report.json not found! You MUST run --verify first.")
        sys.exit(1)

    verify_data = json.loads(VERIFY_REPORT.read_text(encoding="utf-8"))
    unverified = [r for r in verify_data if r.get("status") != "verified"]
    if unverified:
        logger.error("Verification report has unverified assets! Run --verify and resolve issues before updating DB.")
        sys.exit(1)

    # Backup first unless dry-run
    if not dry_run:
        if not _backup_collections():
            logger.error("Backup failed! Aborting database update.")
            sys.exit(1)

    # Build lookup map: verified public_id -> new R2 metadata structure
    entries = load_map()
    verified_pid_map: Dict[str, Dict[str, Any]] = {}
    for e in entries.values():
        if e.get("status") != "verified":
            continue
        pid = e.get("public_id")
        new_key = e.get("new_key", "")
        fmt = e.get("format", "jpg")

        r2_obj = {
            "storage": "r2",
            "key": new_key,
            "content_type": f"image/{fmt}" if fmt in ("jpg", "png", "webp", "gif") else "application/octet-stream",
            "bytes": e.get("bytes"),
        }
        if pid:
            verified_pid_map[pid] = r2_obj

    if not verified_pid_map:
        logger.warning("No verified entries found in migration map to update.")
        return

    verified_pids = set(verified_pid_map.keys())
    logger.info("Loaded %d verified target public_id mappings.", len(verified_pid_map))

    db = get_mongo_db()
    coll_names = [c for c in db.list_collection_names() if c != "migration_map"]

    total_docs_updated = 0
    total_fields_updated = 0
    diff_samples: List[str] = []

    for coll_name in coll_names:
        coll = db[coll_name]
        ops: List[UpdateOne] = []

        for doc in coll.find({}):
            doc_id = doc["_id"]
            sets: Dict[str, Any] = {}

            def _walk(obj: Any, path: str = ""):
                nonlocal total_fields_updated
                if isinstance(obj, dict):
                    # Check if already migrated object
                    if obj.get("storage") == "r2":
                        return
                    for k, v in obj.items():
                        _walk(v, f"{path}.{k}" if path else k)
                elif isinstance(obj, list):
                    for i, v in enumerate(obj):
                        _walk(v, f"{path}.{i}")
                elif isinstance(obj, str):
                    pid = extract_public_id(obj, verified_pids)
                    if pid and pid in verified_pid_map:
                        target_meta = verified_pid_map[pid]
                        sets[path] = target_meta
                        sets[f"{path}__legacy_cloudinary_url"] = obj
                        total_fields_updated += 1
                        if len(diff_samples) < 5:
                            diff_samples.append(f"[{coll_name}] doc={doc_id} field={path}\n  OLD: {mask_example(obj)}\n  NEW: {target_meta}")

            _walk(doc)

            if sets:
                total_docs_updated += 1
                ops.append(UpdateOne({"_id": doc_id}, {"$set": sets}))

                if len(ops) >= BATCH_SIZE:
                    if not dry_run:
                        coll.bulk_write(ops, ordered=False)
                    ops.clear()

        if ops:
            if not dry_run:
                coll.bulk_write(ops, ordered=False)
            ops.clear()

    print("\n" + "=" * 70)
    print("  DATABASE UPDATE SUMMARY" + (" (DRY RUN)" if dry_run else ""))
    print("=" * 70)
    print(f"  Documents Affected : {total_docs_updated}")
    print(f"  Fields Replaced    : {total_fields_updated}")
    if diff_samples:
        print("-" * 70)
        print("  SAMPLE DIFFERENCES:")
        for sample in diff_samples:
            print(sample)
    print("=" * 70)
    if dry_run:
        print("  ** DRY-RUN COMPLETE: No changes were written to MongoDB **\n")
    else:
        print("  ** DB UPDATE COMPLETE: All changes applied. Legacy URLs preserved. **\n")

    logger.info("DB update completed. Docs updated: %d, Fields updated: %d, DryRun: %s.",
                total_docs_updated, total_fields_updated, dry_run)

# ============================================================================
# STEP 4: ROLLBACK
# ============================================================================
def step_rollback():
    logger.info("===== STEP 4: ROLLBACK =====")
    db = get_mongo_db()
    coll_names = [c for c in db.list_collection_names() if c != "migration_map"]

    total_restored_docs = 0
    total_restored_fields = 0

    for coll_name in coll_names:
        coll = db[coll_name]
        ops: List[UpdateOne] = []

        for doc in coll.find({}):
            doc_id = doc["_id"]
            sets: Dict[str, Any] = {}
            unsets: Dict[str, Any] = {}

            def _walk(obj: Any, path: str = ""):
                nonlocal total_restored_fields
                if isinstance(obj, dict):
                    # Check if legacy URL key exists at this level or next
                    for k, v in list(obj.items()):
                        if k.endswith("__legacy_cloudinary_url"):
                            base_key = k[:-23]
                            legacy_val = v
                            full_base_path = f"{path}.{base_key}" if path else base_key
                            full_legacy_path = f"{path}.{k}" if path else k
                            sets[full_base_path] = legacy_val
                            unsets[full_legacy_path] = ""
                            total_restored_fields += 1
                        else:
                            _walk(v, f"{path}.{k}" if path else k)
                elif isinstance(obj, list):
                    for i, v in enumerate(obj):
                        _walk(v, f"{path}.{i}")

            _walk(doc)

            if sets:
                total_restored_docs += 1
                update_cmd: Dict[str, Any] = {"$set": sets}
                if unsets:
                    update_cmd["$unset"] = unsets
                ops.append(UpdateOne({"_id": doc_id}, update_cmd))

                if len(ops) >= BATCH_SIZE:
                    coll.bulk_write(ops, ordered=False)
                    ops.clear()

        if ops:
            coll.bulk_write(ops, ordered=False)
            ops.clear()

    print("\n" + "=" * 70)
    print("  ROLLBACK COMPLETE")
    print("=" * 70)
    print(f"  Documents Restored : {total_restored_docs}")
    print(f"  Fields Restored    : {total_restored_fields}")
    print("  Legacy Cloudinary URLs restored from '__legacy_cloudinary_url'.")
    print("  R2 objects were NOT deleted. Cloudinary assets were untouched.")
    print("=" * 70 + "\n")

    logger.info("Rollback complete. Restored %d docs, %d fields.", total_restored_docs, total_restored_fields)

# ============================================================================
# CLI Argument Parsing & Entry Point
# ============================================================================
def parse_args():
    p = argparse.ArgumentParser(
        description="Safe, idempotent migration of Cloudinary assets to Cloudflare R2 (DentaFlow)"
    )
    p.add_argument("--discover", action="store_true", help="Step 0 – Read-only scan of DB & Cloudinary")
    p.add_argument("--copy", action="store_true", help="Step 1 – Resumable streaming copy to R2")
    p.add_argument("--verify", action="store_true", help="Step 2 – Integrity check R2 objects vs original sha256")
    p.add_argument("--update-db", action="store_true", help="Step 3 – Backup & replace DB references")
    p.add_argument("--dry-run", action="store_true", help="Use with --update-db to preview without writing")
    p.add_argument("--rollback", action="store_true", help="Step 4 – Restore original Cloudinary URLs in DB")
    return p.parse_args()

def main():
    args = parse_args()

    if not any([args.discover, args.copy, args.verify, args.update_db, args.rollback]):
        print("No migration step specified. Run with --help for available flags.")
        sys.exit(0)

    # Credentials check
    missing = []
    if args.discover or args.copy:
        if not CLOUD_NAME:   missing.append("CLOUDINARY_CLOUD_NAME")
        if not CLOUD_KEY:    missing.append("CLOUDINARY_API_KEY")
        if not CLOUD_SECRET: missing.append("CLOUDINARY_API_SECRET")
    if args.copy or args.verify:
        if not R2_ACCOUNT_ID:    missing.append("R2_ACCOUNT_ID")
        if not R2_ACCESS_KEY_ID: missing.append("R2_ACCESS_KEY_ID")
        if not R2_SECRET_KEY:    missing.append("R2_SECRET_ACCESS_KEY")
        if not R2_BUCKET:        missing.append("R2_BUCKET")
    if not MONGO_URL: missing.append("MONGO_URL")

    if missing:
        logger.error("Missing required environment variables: %s", ", ".join(missing))
        sys.exit(1)

    acquire_lock()
    try:
        if args.discover:
            step_discover()
        if args.copy:
            step_copy()
        if args.verify:
            step_verify()
        if args.update_db:
            step_update_db(dry_run=args.dry_run)
        if args.rollback:
            step_rollback()
    finally:
        release_lock()

if __name__ == "__main__":
    main()
