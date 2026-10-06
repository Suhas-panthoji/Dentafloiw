"""Live Cloudflare R2 connection test script.

Usage:
  1. Set R2 credentials in backend/.env:
     STORAGE_BACKEND=r2
     R2_ACCOUNT_ID=your_account_id
     R2_ACCESS_KEY_ID=your_access_key
     R2_SECRET_ACCESS_KEY=your_secret_key
     R2_BUCKET=your_bucket_name

  2. Run:
     python test_r2_live.py
"""
import io
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from storage import make_storage, StorageConfigurationError

def run_live_test():
    print("Initializing R2 storage connection...")
    os.environ["STORAGE_BACKEND"] = "r2"
    
    try:
        storage = make_storage()
    except StorageConfigurationError as e:
        print(f"[CONFIGURATION ERROR] {e}")
        return False

    test_key = "test_live_connection.txt"
    test_content = b"DentaFlow Cloudflare R2 Live Connection Verification"

    print(f"1. Uploading test object '{test_key}' to R2 bucket '{storage.bucket}'...")
    try:
        storage.upload_file(io.BytesIO(test_content), test_key, "text/plain")
        print("   [OK] Upload successful!")
    except Exception as e:
        print(f"   [ERROR] Upload failed: {e}")
        return False

    print("2. Checking object existence in bucket...")
    if storage.exists(test_key):
        print("   [OK] Object exists!")
    else:
        print("   [ERROR] Object reported missing!")
        return False

    print("3. Generating 5-minute presigned GET URL...")
    try:
        presigned_url = storage.get_presigned_url(test_key, expires=300, content_type="text/plain")
        print(f"   [OK] Presigned URL generated:\n      {presigned_url}")
    except Exception as e:
        print(f"   [ERROR] Presigned URL generation failed: {e}")
        return False

    print("4. Fetching content from presigned URL...")
    try:
        req = urllib.request.Request(presigned_url, headers={"User-Agent": "DentaFlow-Test/1.0"})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            if data == test_content:
                print("   [OK] Fetched data matches uploaded content!")
            else:
                print(f"   [ERROR] Content mismatch! Got: {data}")
                return False
    except Exception as e:
        print(f"   [ERROR] HTTP fetch failed: {e}")
        return False

    print(f"5. Cleaning up test object '{test_key}'...")
    try:
        storage.delete_file(test_key)
        if not storage.exists(test_key):
            print("   [OK] Cleanup verified! Object successfully deleted.")
        else:
            print("   [WARNING] Object still exists after delete.")
    except Exception as e:
        print(f"   [ERROR] Delete failed: {e}")
        return False

    print("\n==================================================")
    print(" [SUCCESS] LIVE CLOUDFLARE R2 CONNECTION TEST PASSED 100%! ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_live_test()
    sys.exit(0 if success else 1)
