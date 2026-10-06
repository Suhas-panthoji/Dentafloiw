#!/usr/bin/env python3
"""
rollback.py – Rollback script for DentaFlow Cloudinary to R2 Migration.

Restores original Cloudinary URLs and public_ids saved in legacy fields
(__legacy_cloudinary_url or legacy_cloudinary_url) back to main document fields
and removes the legacy fields.

Usage:
    python rollback.py --dry-run
    python rollback.py
"""

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
import pymongo
from pymongo import UpdateOne

load_dotenv(Path(__file__).parent / ".env", override=True)

MONGO_URL = os.environ.get("MONGO_URL", "")
DB_NAME   = os.environ.get("DB_NAME", "dentaflow_db")
BATCH_SIZE = 100

log_dir = Path(__file__).parent / "log"
log_dir.mkdir(exist_ok=True)

logger = logging.getLogger("rollback")
logger.setLevel(logging.INFO)

if not logger.handlers:
    fmt = logging.Formatter("%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    fh = logging.FileHandler(log_dir / "rollback.log", encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

def rollback_db(dry_run: bool = False):
    logger.info("===== STARTING MIGRATION ROLLBACK %s =====", "(DRY RUN)" if dry_run else "")
    if not MONGO_URL:
        logger.error("MONGO_URL environment variable is required.")
        sys.exit(1)

    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]

    coll_names = [c for c in db.list_collection_names() if c != "migration_map"]
    total_docs = 0
    total_fields = 0

    for coll_name in coll_names:
        coll = db[coll_name]
        ops: List[UpdateOne] = []

        for doc in coll.find({}):
            doc_id = doc["_id"]
            sets: Dict[str, Any] = {}
            unsets: Dict[str, Any] = {}

            def _walk(obj: Any, path: str = ""):
                nonlocal total_fields
                if isinstance(obj, dict):
                    for k, v in list(obj.items()):
                        if k.endswith("__legacy_cloudinary_url") or k == "legacy_cloudinary_url":
                            if k == "legacy_cloudinary_url":
                                base_key = "photo" if "photo" in obj else path.split(".")[-1]
                                full_base_path = path
                                full_legacy_path = f"{path}.{k}" if path else k
                            else:
                                base_key = k[:-23]
                                full_base_path = f"{path}.{base_key}" if path else base_key
                                full_legacy_path = f"{path}.{k}" if path else k
                            sets[full_base_path] = v
                            unsets[full_legacy_path] = ""
                            total_fields += 1
                        else:
                            _walk(v, f"{path}.{k}" if path else k)
                elif isinstance(obj, list):
                    for i, v in enumerate(obj):
                        _walk(v, f"{path}.{i}")

            _walk(doc)

            if sets:
                total_docs += 1
                update_cmd: Dict[str, Any] = {"$set": sets}
                if unsets:
                    update_cmd["$unset"] = unsets
                ops.append(UpdateOne({"_id": doc_id}, update_cmd))

                if len(ops) >= BATCH_SIZE:
                    if not dry_run:
                        coll.bulk_write(ops, ordered=False)
                    ops.clear()

        if ops:
            if not dry_run:
                coll.bulk_write(ops, ordered=False)
            ops.clear()

    print("\n" + "=" * 70)
    print("  ROLLBACK REPORT" + (" (DRY RUN)" if dry_run else ""))
    print("=" * 70)
    print(f"  Documents Affected : {total_docs}")
    print(f"  Fields Restored    : {total_fields}")
    print("=" * 70)
    if dry_run:
        print("  ** DRY-RUN COMPLETE: No changes were written to MongoDB **\n")
    else:
        print("  ** ROLLBACK COMPLETE: Legacy Cloudinary URLs restored. **\n")

    print("IMPORTANT POST-ROLLBACK NOTICE:")
    print("1. Cloudinary assets were NEVER modified or deleted.")
    print("2. Cloudflare R2 objects remain in your R2 bucket unchanged.")
    print("3. Verify application health using Cloudinary URLs.\n")

    logger.info("Rollback complete. Docs: %d, Fields: %d, DryRun: %s.", total_docs, total_fields, dry_run)

def main():
    parser = argparse.ArgumentParser(description="Rollback DentaFlow MongoDB documents to legacy Cloudinary URLs")
    parser.add_argument("--dry-run", action="store_true", help="Preview rollback changes without writing to DB")
    args = parser.parse_args()
    rollback_db(dry_run=args.dry_run)

if __name__ == "__main__":
    main()
