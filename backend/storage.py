"""Private object storage abstraction for DentaFlow.

R2 credentials are read only from environment variables.  ``mock`` is useful for
tests and local development; its objects are intentionally ephemeral.
"""
import io
import os
from pathlib import Path
from urllib.parse import quote


class StorageConfigurationError(RuntimeError):
    pass


class ObjectStorage:
    def __init__(self):
        self.backend = os.getenv("STORAGE_BACKEND", "mock").lower()
        if self.backend not in {"r2", "mock"}:
            raise StorageConfigurationError("STORAGE_BACKEND must be 'r2' or 'mock'")
        self.root = Path(os.getenv("MOCK_STORAGE_DIR", ".mock-storage"))
        self.client = None
        self.bucket = os.getenv("R2_BUCKET", "")
        if self.backend == "r2":
            missing = [name for name in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET") if not os.getenv(name)]
            if missing:
                raise StorageConfigurationError("R2 credentials missing: set " + ", ".join(missing))
            import boto3
            self.client = boto3.client(
                "s3", region_name="auto",
                endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            )

    def upload_file(self, fileobj, key, content_type):
        fileobj.seek(0)
        if self.backend == "mock":
            target = self.root / key
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("wb") as destination:
                while chunk := fileobj.read(1024 * 1024):
                    destination.write(chunk)
            return
        self.client.upload_fileobj(fileobj, self.bucket, key, ExtraArgs={"ContentType": content_type})

    def delete_file(self, key):
        if not key:
            return
        if self.backend == "mock":
            (self.root / key).unlink(missing_ok=True)
            return
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def exists(self, key):
        if self.backend == "mock":
            return (self.root / key).is_file()
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except self.client.exceptions.ClientError:
            return False

    def get_presigned_url(self, key, expires=300, content_type=None, filename=None):
        if self.backend == "mock":
            return f"mock://private/{quote(key)}?expires={expires}"
        params = {"Bucket": self.bucket, "Key": key}
        if content_type:
            params["ResponseContentType"] = content_type
        if filename:
            params["ResponseContentDisposition"] = f'inline; filename="{filename}"'
        return self.client.generate_presigned_url("get_object", Params=params, ExpiresIn=expires)

    def open_mock(self, key):
        if self.backend != "mock":
            raise StorageConfigurationError("Mock files are unavailable when STORAGE_BACKEND=r2")
        return (self.root / key).open("rb")


def make_storage():
    return ObjectStorage()
