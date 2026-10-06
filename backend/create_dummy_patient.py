"""Script to insert a dummy patient with a real image uploaded to R2 into dentaflow_db."""
import asyncio
import os
import uuid
import io
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env", override=True)

sys.path.insert(0, str(Path(__file__).parent))
from storage import make_storage
from image_pipeline import prepare_upload


def generate_test_image():
    """Create a 600x800 test JPEG with text overlay simulating a patient photo."""
    img = Image.new("RGB", (600, 800), color=(30, 120, 180))
    draw = ImageDraw.Draw(img)
    # Draw some shapes to make it look like a real photo
    draw.rectangle([50, 50, 550, 750], outline="white", width=3)
    draw.ellipse([200, 150, 400, 400], fill=(255, 200, 150))  # face shape
    draw.ellipse([250, 230, 290, 270], fill=(60, 60, 60))     # left eye
    draw.ellipse([310, 230, 350, 270], fill=(60, 60, 60))     # right eye
    draw.arc([260, 300, 340, 360], 0, 180, fill=(60, 60, 60), width=2)  # smile
    # Add text
    draw.text((140, 450), "R2 Test Patient", fill="white")
    draw.text((160, 500), "DentaFlow QA", fill=(200, 255, 200))
    draw.text((120, 600), "Cloudflare R2 Storage", fill=(255, 255, 100))
    draw.text((170, 650), "Verified!", fill=(100, 255, 100))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=90)
    return buf.getvalue()


async def create_dummy_patient():
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ.get("DB_NAME", "dentaflow_db")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    pid = str(uuid.uuid4())
    img_id = str(uuid.uuid4())

    # 1. Generate and process test image through the pipeline
    print("1. Generating test patient image...")
    jpeg_data = generate_test_image()
    print(f"   Generated {len(jpeg_data)} byte JPEG")

    print("2. Running image through pipeline (EXIF strip, WebP conversion, thumbnails)...")
    prepared = prepare_upload(io.BytesIO(jpeg_data), "image/jpeg", "photo")
    print(f"   Original: {len(prepared['original'])} bytes ({prepared['original_type']})")
    print(f"   Thumbnail: {len(prepared['thumb'])} bytes")
    print(f"   Display: {len(prepared['display'])} bytes")

    # 2. Upload all variants to R2
    print("3. Uploading to Cloudflare R2...")
    storage = make_storage()
    base = f"patients/{pid}/photo/{img_id}"
    ext = "webp"
    key = f"{base}.{ext}"
    thumb_key = f"{base}_thumb.webp"
    display_key = f"{base}_display.webp"

    storage.upload_file(io.BytesIO(prepared["original"]), key, prepared["original_type"])
    print(f"   [OK] Original  -> {key}")
    storage.upload_file(io.BytesIO(prepared["thumb"]), thumb_key, "image/webp")
    print(f"   [OK] Thumbnail -> {thumb_key}")
    storage.upload_file(io.BytesIO(prepared["display"]), display_key, "image/webp")
    print(f"   [OK] Display   -> {display_key}")

    # 3. Verify files exist in R2
    print("4. Verifying uploaded objects exist in R2...")
    for k in (key, thumb_key, display_key):
        assert storage.exists(k), f"MISSING: {k}"
        print(f"   [OK] {k}")

    # 4. Generate presigned URLs to verify accessibility
    print("5. Generating presigned URLs...")
    for k in (key, thumb_key, display_key):
        url = storage.get_presigned_url(k, expires=300, content_type="image/webp")
        print(f"   {k.split('/')[-1]}: {url[:80]}...")

    # 5. Insert patient into MongoDB
    print("6. Inserting dummy patient into MongoDB...")
    photo_record = {
        "id": img_id,
        "storage": "r2",
        "key": key,
        "thumb_key": thumb_key,
        "display_key": display_key,
        "content_type": prepared["original_type"],
        "bytes": len(prepared["original"])
    }

    patient_doc = {
        "id": pid,
        "created_at": "2026-10-06T19:15:00.000Z",
        "updated_at": "2026-10-06T19:15:00.000Z",
        "general": {
            "first_name": "R2_Test",
            "last_name": "VerificationPatient",
            "dob": "1995-05-20",
            "mobile": "+919998887770",
            "email": "r2.test@clinic.com",
            "gender": "Female",
            "marital": "Single",
            "referred_by": "Walk-in",
            "occupation": "QA Engineer",
            "address": "100 Cloudflare Way",
            "area": "R2 Storage District",
            "city": "Bangalore",
            "state": "Karnataka",
            "pincode": "560001"
        },
        "medical": {
            "diseases": [],
            "other_disease": "",
            "medications": [],
            "notes": "R2 storage validation test record."
        },
        "oral_exam": {
            "tissues": {},
            "conditions": [],
            "hygiene": "Good",
            "occlusion": "Class I",
            "complaint": "Storage test",
            "notes": ""
        },
        "photo": photo_record,
        "signature": None,
        "odontogram": {"teeth": {}, "history": []},
        "visits": [],
        "clinical_photos": [],
        "radiographs": [],
        "documents": []
    }

    await db.patients.insert_one(patient_doc)
    print(f"   [OK] Patient inserted!")

    print("\n==================================================")
    print(" [SUCCESS] DUMMY PATIENT WITH R2 IMAGE CREATED!")
    print("==================================================")
    print(f"  Patient ID   : {pid}")
    print(f"  Patient Name : R2_Test VerificationPatient")
    print(f"  Photo Key    : {key}")
    print(f"  Thumb Key    : {thumb_key}")
    print(f"  Display Key  : {display_key}")
    print(f"  R2 Bucket    : {storage.bucket}")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(create_dummy_patient())

