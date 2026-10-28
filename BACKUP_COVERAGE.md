# Backup coverage inventory

The current schema keeps patient-linked clinical data inside `patients`; no separate `visits`, `payments`, `appointments`, `prescriptions`, `notes`, `consent`, `signatures`, or `media` collections exist. The implementation adds an explicit coverage registry and a startup guard so this list cannot silently drift.

| Collection / data | Current location | Backup treatment |
|---|---|---|
| Patient demographics, medical and oral exam | `patients.general`, `medical`, `oral_exam` | Full patient-document version. |
| Odontogram / tooth chart | `patients.odontogram` | Full patient-document version; no whitelist. |
| Visits, payments and appointments | `patients.visits` | Patient-document version plus immutable per-child version. Payments/appointments are embedded visit fields where present. |
| Prescriptions and clinical notes | Nested patient/visit fields | Full BSON JSON document serialization, including arbitrary nested fields. |
| Consent and signatures | `patients.signature` and nested fields | Patient-document version; signature media copied to backup file layout when backed by R2. |
| Clinical photos, radiographs, documents | Patient media fields | Metadata versions only. Binary copy into the backup bucket is not yet implemented. |
| Treatment catalogue | `treatments` | System-record versions under `system/treatments/...`; it is not patient-linked. |
| Users, sessions, password history, usage counters | Separate operational collections | Explicitly excluded: credentials, auth/session telemetry, and derived metrics are not clinical records. |

`backend/backup/coverage.py` is the authoritative registry. The startup guard compares Mongo collections to it and fails if a collection is neither covered nor excluded. Each versioned JSON record retains the five newest versions by default (`BACKUP_RETENTION_VERSIONS=5`); retention is scoped to one record prefix.

## Known coverage gaps

The required binary media layout (`patients/<patient_id>/files/<file_id>/...`) and scheduled full-database snapshots/manifests are not implemented in this change. They must be completed before treating the service as a complete recovery system.
