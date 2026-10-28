import base64
import hashlib
import os
import re
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class BackupConfigurationError(RuntimeError):
    pass


class BackupStorage:
    """Dedicated backup bucket client. Never reads R2_* image settings."""
    def __init__(self):
        self.backend = os.getenv("BACKUP_STORAGE", "mock").lower()
        if self.backend not in {"mock", "r2"}:
            raise BackupConfigurationError("BACKUP_STORAGE must be 'mock' or 'r2'")
        self.root = Path(os.getenv("BACKUP_MOCK_DIR", ".mock-backup"))
        self.client = None
        self.bucket = os.getenv("BACKUP_BUCKET", "")
        try:
            self.retention_versions = int(os.getenv("BACKUP_RETENTION_VERSIONS", "5"))
        except ValueError as exc:
            raise BackupConfigurationError("BACKUP_RETENTION_VERSIONS must be an integer") from exc
        if self.retention_versions < 1:
            raise BackupConfigurationError("BACKUP_RETENTION_VERSIONS must be at least 1")
        raw_key = os.getenv("BACKUP_ENCRYPTION_KEY", "")
        if self.backend == "r2":
            missing = [key for key in ("BACKUP_ENDPOINT", "BACKUP_BUCKET", "BACKUP_ACCESS_KEY_ID", "BACKUP_SECRET_ACCESS_KEY", "BACKUP_ENCRYPTION_KEY") if not os.getenv(key)]
            if missing:
                raise BackupConfigurationError("Backup is pending: missing " + ", ".join(missing))
        if raw_key:
            try:
                self.key = base64.b64decode(raw_key, validate=True)
            except Exception as exc:
                raise BackupConfigurationError("BACKUP_ENCRYPTION_KEY must be base64") from exc
            if len(self.key) != 32:
                raise BackupConfigurationError("BACKUP_ENCRYPTION_KEY must decode to 32 bytes")
        elif self.backend == "mock":
            self.key = b"\0" * 32  # deterministic test-only key; never used for R2
        if self.backend == "r2":
            import boto3
            from botocore.config import Config
            self.client = boto3.client("s3", region_name="auto", endpoint_url=os.environ["BACKUP_ENDPOINT"],
                aws_access_key_id=os.environ["BACKUP_ACCESS_KEY_ID"], aws_secret_access_key=os.environ["BACKUP_SECRET_ACCESS_KEY"],
                config=Config(signature_version="s3v4", connect_timeout=3, read_timeout=15, retries={"max_attempts": 3, "mode": "standard"}))

    def encrypt(self, data: bytes) -> bytes:
        nonce = os.urandom(12)
        return nonce + AESGCM(self.key).encrypt(nonce, data, None)

    def decrypt(self, value: bytes) -> bytes:
        return AESGCM(self.key).decrypt(value[:12], value[12:], None)

    def put_if_absent(self, key: str, data: bytes):
        if self.exists(key):
            return False
        if self.backend == "mock":
            target = self.root / key
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        else:
            # Immutable keys are protected by a HEAD check; version races are safe because data is identical per version.
            self.client.put_object(Bucket=self.bucket, Key=key, Body=data, Metadata={"sha256": hashlib.sha256(data).hexdigest()})
        return True

    def exists(self, key: str) -> bool:
        try:
            self.head(key)
            return True
        except FileNotFoundError:
            return False

    def head(self, key: str):
        if self.backend == "mock":
            path = self.root / key
            if not path.is_file(): raise FileNotFoundError(key)
            data = path.read_bytes()
            return {"ContentLength": len(data), "Metadata": {"sha256": hashlib.sha256(data).hexdigest()}}
        try:
            return self.client.head_object(Bucket=self.bucket, Key=key)
        except self.client.exceptions.ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code in {"404", "NoSuchKey", "NotFound"}: raise FileNotFoundError(key) from exc
            raise

    def get(self, key: str) -> bytes:
        if self.backend == "mock": return (self.root / key).read_bytes()
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    def delete_healthcheck(self, key: str):
        if not key.startswith("_healthcheck/"): raise ValueError("Only healthcheck objects may be deleted")
        if self.backend == "mock": (self.root / key).unlink(missing_ok=True)
        else: self.client.delete_object(Bucket=self.bucket, Key=key)

    def prune_versions(self, prefix: str):
        """Keep the configured newest immutable `v<N>.json.enc` objects only.

        This is deliberately limited to a supplied per-record prefix; it cannot
        affect the image bucket, other patients, manifests, or snapshots.
        """
        pattern = re.compile(r"/v(\d+)\.json\.enc$")
        if self.backend == "mock":
            keys = [path.relative_to(self.root).as_posix() for path in self.root.glob(prefix + "v*.json.enc")]
        else:
            pages = self.client.get_paginator("list_objects_v2").paginate(Bucket=self.bucket, Prefix=prefix)
            keys = [item["Key"] for page in pages for item in page.get("Contents", [])]
        versions = sorted(((int(match.group(1)), key) for key in keys if (match := pattern.search(key))), reverse=True)
        for _, key in versions[self.retention_versions:]:
            if self.backend == "mock":
                (self.root / key).unlink(missing_ok=True)
            else:
                self.client.delete_object(Bucket=self.bucket, Key=key)
        return len(versions[self.retention_versions:])

    def verify(self, key: str, data: bytes):
        head = self.head(key)
        digest = hashlib.sha256(data).hexdigest()
        if head["ContentLength"] != len(data) or head.get("Metadata", {}).get("sha256") != digest:
            raise RuntimeError("Backup upload verification failed")
