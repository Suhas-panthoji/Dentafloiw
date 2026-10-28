# DentaFlow backup audit

Audit date: 2026-10-28. Scope: repository source, tests, documentation, and Git history. This audit is intentionally based on source only; no database or R2 bucket was contacted.

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Version and backup block on patients and child records | MISSING | Patient creation writes only `id`, timestamps, and creator in `backend/server.py:454-460`; updates do not version records at `backend/server.py:528-534`. |
| 2 | Non-blocking post-save backup task | MISSING | Patient save routes contain only Mongo writes at `backend/server.py:460,534`. |
| 3 | Required backup key layout | MISSING | Image keys use `patients/<id>/<kind>/<id>.<ext>` in `backend/server.py:574-582`; no backup keys exist. |
| 4 | Immutable backup versions | MISSING | No backup writer exists. The migration backup overwrites local migration exports only (`backend/migrate_cloudinary_to_r2.py:621-658`). |
| 5 | BSON JSON serialization and AES-256-GCM | MISSING | No `bson.json_util` or encryption implementation appears in application code. |
| 6 | Post-upload HEAD size/hash verification | MISSING | Image storage has `head_object` existence checking only in `backend/storage.py:72-78`; no backup verification. |
| 7 | Aggregate patient/child backup tick | MISSING | No backup status in API/UI. Patient data is returned directly at `backend/server.py:518-524`. |
| 8 | Persistent retry endpoint | MISSING | No backup retry route or database-backed backup queue exists. |
| 9 | Admin status page and audit endpoint | MISSING | Existing admin endpoints cover users and usage only (`backend/server.py:376-391`). |
| 10 | Restore tools with safe defaults | MISSING | `backend/rollback.py` restores Cloudinary URL fields, not backed-up documents; migration instructions are unrelated (`backend/MIGRATION_README.md:33-43`). |
| 11 | Separate BACKUP_* S3 adapter with mock mode | MISSING | `backend/storage.py:16-47` uses only `STORAGE_BACKEND` and `R2_*` image credentials. |
| 12 | Backup tests | MISSING | Existing test report lists general API tests only (`test_reports/pytest/pytest_results.xml:1`); no backup tests were found. |

## Notes

`boto3` is already a dependency (`backend/requirements.txt:11`) because it is used for the primary private-image bucket. It is not evidence of a backup adapter. The current branch is already `feat/versioned-patient-backup`; the pre-existing uncommitted files were not included in the audit as implementation evidence.
