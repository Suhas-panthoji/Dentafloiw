import io
import sys
from pathlib import Path
from PIL import Image
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from image_pipeline import MAX_UPLOAD_BYTES, UploadValidationError, prepare_upload
from storage import make_storage


def jpeg_with_exif():
    image = Image.new("RGB", (32, 24), "red")
    exif = Image.Exif()
    exif[274] = 6
    output = io.BytesIO()
    image.save(output, "JPEG", exif=exif)
    return output.getvalue()


def test_mock_upload_exists_presign_and_delete(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "mock")
    monkeypatch.setenv("MOCK_STORAGE_DIR", str(tmp_path))
    storage = make_storage()
    storage.upload_file(io.BytesIO(b"tiny"), "patients/p1/documents/a.pdf", "application/pdf")
    assert storage.exists("patients/p1/documents/a.pdf")
    assert "expires=300" in storage.get_presigned_url("patients/p1/documents/a.pdf", expires=300)
    storage.delete_file("patients/p1/documents/a.pdf")
    assert not storage.exists("patients/p1/documents/a.pdf")


def test_image_exif_is_stripped_and_variants_are_webp():
    result = prepare_upload(io.BytesIO(jpeg_with_exif()), "image/jpeg", "clinical_photos")
    assert result["original_type"] == "image/webp"
    with Image.open(io.BytesIO(result["original"])) as image:
        assert image.getexif() == {}
    assert result["thumb"] and result["display"]


def test_oversize_upload_is_rejected():
    with pytest.raises(UploadValidationError, match="exceeds"):
        prepare_upload(io.BytesIO(b"x" * (MAX_UPLOAD_BYTES + 1)), "application/pdf", "documents")


def test_wrong_type_is_rejected():
    with pytest.raises(UploadValidationError, match="Only JPEG"):
        prepare_upload(io.BytesIO(b"not-an-executable"), "application/octet-stream", "documents")


def test_presign_expiry_custom(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "mock")
    monkeypatch.setenv("MOCK_STORAGE_DIR", str(tmp_path))
    storage = make_storage()
    url = storage.get_presigned_url("patients/p1/photo/p.webp", expires=60)
    assert "expires=60" in url


def test_r2_requires_all_credentials(monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "r2")
    for name in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"):
        monkeypatch.delenv(name, raising=False)
    with pytest.raises(Exception, match="R2 credentials missing: set R2_ACCOUNT_ID"):
        make_storage()

