"""Bounded, metadata-stripping image preparation run outside FastAPI's event loop."""
import io
from PIL import Image, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 20_000_000
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
PASSTHROUGH_TYPES = {"application/pdf", "application/dicom", "application/dicom+json"}


class UploadValidationError(ValueError):
    pass


def read_limited(fileobj):
    data = fileobj.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise UploadValidationError("Upload exceeds the 20 MB limit")
    if not data:
        raise UploadValidationError("Upload is empty")
    return data


def _load_clean_image(data: bytes):
    try:
        with Image.open(io.BytesIO(data)) as verify_image:
            verify_image.verify()
        image = Image.open(io.BytesIO(data))
        if image.format == "JPEG":
            image.draft("RGB", (1600, 1600))
        return ImageOps.exif_transpose(image).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise UploadValidationError("Invalid or unsafe image upload") from error


def _webp(image, longest_side):
    copy = image.copy()
    copy.thumbnail((longest_side, longest_side), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    copy.save(output, "WEBP", quality=80, method=4, exif=b"")
    return output.getvalue()


def prepare_upload(fileobj, content_type, kind):
    """Return original/thumbnail/display bytes. Images are stripped of all EXIF."""
    content_type = (content_type or "").lower().split(";")[0]
    data = read_limited(fileobj)
    if content_type in PASSTHROUGH_TYPES:
        return {"original": data, "original_type": content_type, "thumb": None, "display": None}
    if content_type not in IMAGE_TYPES:
        raise UploadValidationError("Only JPEG, PNG, WebP, PDF, and DICOM uploads are allowed")
    image = _load_clean_image(data)
    thumb = _webp(image, 400)
    display = _webp(image, 1600)
    # Diagnostic originals are lossless and metadata-free; clinical images use WebP.
    if kind == "radiographs":
        original = io.BytesIO()
        image.save(original, "PNG", optimize=True, exif=b"")
        return {"original": original.getvalue(), "original_type": "image/png", "thumb": thumb, "display": display}
    return {"original": display, "original_type": "image/webp", "thumb": thumb, "display": display}
