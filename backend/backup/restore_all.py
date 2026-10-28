"""Restore records listed by an explicit manifest into a scratch database."""
import argparse
import asyncio
import json
from bson import json_util
from motor.motor_asyncio import AsyncIOMotorClient
from .storage import BackupStorage

async def main(args):
    if not args.database.endswith("_scratch"):
        raise SystemExit("Refusing non-scratch target database; use a name ending _scratch")
    storage = BackupStorage(); manifest = json.loads(storage.get(f"manifests/{args.as_of}.json"))
    client = AsyncIOMotorClient(args.mongo_url); database = client[args.database]
    try:
        for item in manifest.get("records", []):
            doc = json_util.loads(storage.decrypt(storage.get(item["key"])).decode("utf-8"))
            await database[item["collection"]].replace_one({"id": doc["id"]}, doc, upsert=True)
        await database.patients.create_index("id", unique=True); await database.treatments.create_index("id", unique=True)
        print("restored records:", len(manifest.get("records", [])))
    finally: client.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("--as-of", required=True)
    parser.add_argument("--mongo-url", required=True); parser.add_argument("--database", default="dentaflow_scratch")
    asyncio.run(main(parser.parse_args()))
