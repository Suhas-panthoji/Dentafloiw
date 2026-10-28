"""Restore one immutable record version. Defaults always require a scratch database."""
import argparse
import asyncio

from bson import json_util
from motor.motor_asyncio import AsyncIOMotorClient
from .storage import BackupStorage

async def main(args):
    if not args.database.endswith("_scratch"):
        raise SystemExit("Refusing non-scratch target database; use a name ending _scratch")
    storage = BackupStorage()
    key = f"patients/{args.patient_id}/record/v{args.version}.json.enc"
    document = json_util.loads(storage.decrypt(storage.get(key)).decode("utf-8"))
    client = AsyncIOMotorClient(args.mongo_url)
    try:
        await client[args.database].patients.replace_one({"id": args.patient_id}, document, upsert=True)
        print("restored patients: 1")
    finally:
        client.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--patient-id", required=True); parser.add_argument("--version", required=True, type=int)
    parser.add_argument("--mongo-url", required=True, help="Scratch MongoDB URL only")
    parser.add_argument("--database", default="dentaflow_scratch")
    asyncio.run(main(parser.parse_args()))
