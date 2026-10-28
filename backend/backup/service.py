import copy
import hashlib
import uuid
from datetime import datetime, timezone

from bson import json_util
from .storage import BackupStorage

CHILD_FIELDS = ("visits", "clinical_photos", "radiographs", "documents")
SINGLE_CHILD_FIELDS = ("photo", "signature")

def _business_value(value):
    value = copy.deepcopy(value)
    if isinstance(value, dict):
        value.pop("version", None); value.pop("backup", None)
        return {key: _business_value(item) for key, item in value.items()}
    if isinstance(value, list): return [_business_value(item) for item in value]
    return value

def stamp_patient(incoming, existing=None):
    """Assign immutable version numbers and database-backed pending states."""
    result = copy.deepcopy(incoming)
    old = existing or {}
    result["version"] = old.get("version", 0) + 1
    result["backup"] = {"status": "pending", "version": None, "at": None, "error": None}
    for field in CHILD_FIELDS:
        old_by_id = {str(item.get("id")): item for item in old.get(field, []) if isinstance(item, dict) and item.get("id")}
        stamped = []
        for item in result.get(field, []) or []:
            if not isinstance(item, dict): stamped.append(item); continue
            child = copy.deepcopy(item); child.setdefault("id", str(uuid.uuid4()))
            prior = old_by_id.get(str(child["id"]), {})
            changed = _business_value(child) != _business_value(prior)
            child["version"] = prior.get("version", 0) + 1 if changed else prior.get("version", 1)
            child["backup"] = {"status": "pending" if changed else prior.get("backup", {}).get("status", "pending"), "version": None if changed else prior.get("backup", {}).get("version"), "at": None if changed else prior.get("backup", {}).get("at"), "error": None}
            stamped.append(child)
        result[field] = stamped
    for field in SINGLE_CHILD_FIELDS:
        item = result.get(field)
        if not isinstance(item, dict):
            continue
        prior = old.get(field) if isinstance(old.get(field), dict) else {}
        item.setdefault("id", field)
        changed = _business_value(item) != _business_value(prior)
        item["version"] = prior.get("version", 0) + 1 if changed else prior.get("version", 1)
        item["backup"] = {"status": "pending" if changed else prior.get("backup", {}).get("status", "pending"), "version": None if changed else prior.get("backup", {}).get("version"), "at": None if changed else prior.get("backup", {}).get("at"), "error": None}
    return result

def encrypted_document(storage, document):
    return storage.encrypt(json_util.dumps(document, sort_keys=True).encode("utf-8"))

async def backup_patient(database, patient_id, storage=None):
    storage = storage or BackupStorage()
    patient = await database.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient: return False
    try:
        key = f"patients/{patient_id}/record/v{patient['version']}.json.enc"
        payload = encrypted_document(storage, patient); storage.put_if_absent(key, payload); storage.verify(key, payload)
        storage.prune_versions(f"patients/{patient_id}/record/")
        for field in CHILD_FIELDS:
            for child in patient.get(field, []) or []:
                if not isinstance(child, dict): continue
                child_key = f"patients/{patient_id}/{field}/{child['id']}/v{child['version']}.json.enc"
                child_payload = encrypted_document(storage, child); storage.put_if_absent(child_key, child_payload); storage.verify(child_key, child_payload)
                storage.prune_versions(f"patients/{patient_id}/{field}/{child['id']}/")
                await database.patients.update_one({"id": patient_id, f"{field}.id": child["id"]}, {"$set": {f"{field}.$.backup": {"status": "ok", "version": child["version"], "at": datetime.now(timezone.utc).isoformat(), "error": None}}})
        for field in SINGLE_CHILD_FIELDS:
            child = patient.get(field)
            if not isinstance(child, dict):
                continue
            child_key = f"patients/{patient_id}/{field}/{child['id']}/v{child['version']}.json.enc"
            child_payload = encrypted_document(storage, child); storage.put_if_absent(child_key, child_payload); storage.verify(child_key, child_payload)
            storage.prune_versions(f"patients/{patient_id}/{field}/{child['id']}/")
            await database.patients.update_one({"id": patient_id}, {"$set": {f"{field}.backup": {"status": "ok", "version": child["version"], "at": datetime.now(timezone.utc).isoformat(), "error": None}}})
        await database.patients.update_one({"id": patient_id}, {"$set": {"backup": {"status": "ok", "version": patient["version"], "at": datetime.now(timezone.utc).isoformat(), "error": None}}})
        return True
    except Exception as exc:
        await database.patients.update_one({"id": patient_id}, {"$set": {"backup.status": "failed", "backup.error": str(exc)[:300]}})
        return False

async def retry_pending(database, seconds=20):
    deadline = datetime.now(timezone.utc).timestamp() + seconds; completed = 0
    async for patient in database.patients.find({"backup.status": {"$in": ["pending", "failed"]}}, {"id": 1}):
        if datetime.now(timezone.utc).timestamp() >= deadline: break
        completed += int(await backup_patient(database, patient["id"]))
    return completed

async def backup_system_record(database, collection, record_id, storage=None):
    storage = storage or BackupStorage()
    document = await database[collection].find_one({"id": record_id}, {"_id": 0})
    if not document:
        return False
    version = document.get("version", 1)
    key = f"system/{collection}/{record_id}/v{version}.json.enc"
    try:
        payload = encrypted_document(storage, document); storage.put_if_absent(key, payload); storage.verify(key, payload)
        storage.prune_versions(f"system/{collection}/{record_id}/")
        await database[collection].update_one({"id": record_id}, {"$set": {"backup": {"status": "ok", "version": version, "at": datetime.now(timezone.utc).isoformat(), "error": None}}})
        return True
    except Exception as exc:
        await database[collection].update_one({"id": record_id}, {"$set": {"backup.status": "failed", "backup.error": str(exc)[:300]}})
        return False

def stamp_system(incoming, existing=None):
    result = copy.deepcopy(incoming); old = existing or {}
    result["version"] = old.get("version", 0) + 1
    result["backup"] = {"status": "pending", "version": None, "at": None, "error": None}
    return result
