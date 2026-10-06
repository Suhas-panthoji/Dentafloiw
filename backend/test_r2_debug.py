import os
import boto3
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env", override=True)



client = boto3.client(
    "s3",
    region_name="auto",
    endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
)

print("Testing ListBuckets...")
try:
    res = client.list_buckets()
    print("Buckets:", [b['Name'] for b in res.get('Buckets', [])])
except Exception as e:
    print("ListBuckets Error:", e)

print("\nTesting ListObjectsV2 on 'dentaflow'...")
try:
    res = client.list_objects_v2(Bucket="dentaflow", MaxKeys=5)
    print("Objects found:", len(res.get("Contents", [])))
    for obj in res.get("Contents", []):
        print(" -", obj["Key"])
except Exception as e:
    print("ListObjects Error:", e)
