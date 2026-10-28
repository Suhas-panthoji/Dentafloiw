import os
from pathlib import Path

from backup.service import stamp_patient, encrypted_document
from backup.storage import BackupStorage

def test_versions_are_immutable_and_encrypted(tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_STORAGE", "mock"); monkeypatch.setenv("BACKUP_MOCK_DIR", str(tmp_path))
    first = stamp_patient({"visits": [{"id": "v1", "notes": "x"}], "clinical_photos": [], "radiographs": [], "documents": []})
    assert first["version"] == 1 and first["visits"][0]["version"] == 1
    second = stamp_patient({"visits": [{"id": "v1", "notes": "changed"}], "clinical_photos": [], "radiographs": [], "documents": []}, first)
    assert second["version"] == 2 and second["visits"][0]["version"] == 2
    storage = BackupStorage(); payload = encrypted_document(storage, second)
    key = "patients/p1/record/v2.json.enc"; assert storage.put_if_absent(key, payload)
    storage.verify(key, payload); assert storage.decrypt(storage.get(key)) != b""
    assert not storage.put_if_absent(key, b"different")

def test_retention_keeps_five_newest_versions(tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_STORAGE", "mock"); monkeypatch.setenv("BACKUP_MOCK_DIR", str(tmp_path))
    storage = BackupStorage()
    for version in range(1, 8):
        key = f"patients/p1/record/v{version}.json.enc"
        storage.put_if_absent(key, storage.encrypt(str(version).encode()))
    assert storage.prune_versions("patients/p1/record/") == 2
    remaining = sorted(path.name for path in (tmp_path / "patients/p1/record").glob("*") )
    assert remaining == [f"v{version}.json.enc" for version in range(3, 8)]
