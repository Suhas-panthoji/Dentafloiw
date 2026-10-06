# Cloudinary to Cloudflare R2 Migration Guide for DentaFlow

This guide provides step-by-step instructions for safely migrating all dental clinic patient assets from Cloudinary to Cloudflare R2 without data loss or downtime.

---

## Environment Configuration

Ensure the following environment variables are configured in `backend/.env`:

```env
MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/?appName=Cluster0"
DB_NAME="dentaflow_db"

CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

R2_ACCOUNT_ID="your_account_id"
R2_ACCESS_KEY_ID="your_access_key"
R2_SECRET_ACCESS_KEY="your_secret_key"
R2_BUCKET="dentaflow-app"
```

---

## Step 0: How to Test on a Scratch (COPY) Database First

Before running the migration against your production database, test on a copy database:

1. **Dump/Export Production Database**:
   ```bash
   mongodump --uri="MONGO_URL" --db="dentaflow_db" --out=./scratch_backup
   ```
2. **Restore to a Scratch Database**:
   ```bash
   mongorestore --uri="MONGO_URL" --nsInclude="dentaflow_scratch.*" ./scratch_backup/dentaflow_db
   ```
3. **Run Migration on Scratch Database**:
   - Temporarily set `DB_NAME="dentaflow_scratch"` in `backend/.env`.
   - Perform Steps 1 through 4 below.
   - Verify application functionality against `dentaflow_scratch`.
4. **Revert `.env`**: Set `DB_NAME="dentaflow_db"` back to production when ready.

---

## Step-by-Step Migration Execution

All migration steps are executed via `migrate_cloudinary_to_r2.py` inside the `backend` directory.

### Step 0: Discovery (Read-Only)
Scans every collection and field in MongoDB for Cloudinary URLs/public_ids, fetches all Cloudinary assets, and reports orphans and broken links.

```bash
cd backend
python migrate_cloudinary_to_r2.py --discover
```

- Output displays collections scanned, reference counts, and masked examples.
- Progress saved to `migration_map.jsonl` and Mongo `migration_map` collection.

### Step 1: Resumable Copy to R2
Streams original files directly from Cloudinary into Cloudflare R2.

```bash
python migrate_cloudinary_to_r2.py --copy
```

- Uses bounded chunked streaming (memory-safe).
- Idempotent: checks R2 object size and skips existing assets.
- Handles Cloudinary rate limits (HTTP 429) with exponential backoff.
- Generates optional thumbnail WebP variants if Pillow pipeline is available.

### Step 2: Integrity Verification
Verifies object existence, byte sizes, and SHA-256 checksums in R2 against the migration map.

```bash
python migrate_cloudinary_to_r2.py --verify
```

- Generates `verify_report.json`.
- **Note**: `--update-db` will refuse to run if `--verify` fails or finds any missing/mismatched objects.

### Step 3: Database Update

#### 3a. Dry-Run Preview (No Writes)
Preview document updates, field replacement counts, and diff samples without modifying MongoDB.

```bash
python migrate_cloudinary_to_r2.py --update-db --dry-run
```

#### 3b. Apply Database Changes
Backs up all affected MongoDB collections to `backend/db_backup/` as JSON exports, replaces Cloudinary references with `{ "storage": "r2", "key": "..." }`, and stores original URLs in `__legacy_cloudinary_url`.

```bash
python migrate_cloudinary_to_r2.py --update-db
```

---

## Rollback Procedure

If any issue arises, restore original Cloudinary URLs to MongoDB using either method:

### Option A: Standalone Rollback Script
```bash
python rollback.py --dry-run   # Preview rollback
python rollback.py           # Apply rollback
```

### Option B: Migration Script Flag
```bash
python migrate_cloudinary_to_r2.py --rollback
```

*Rollback restores all original URLs from `__legacy_cloudinary_url`. Nothing in Cloudinary or R2 is deleted.*

---

## Deleting Cloudinary Assets (Post-Migration Cleanup)

**DO NOT delete any assets from Cloudinary immediately!**

1. Keep Cloudinary assets intact for **at least 2 weeks** while running production on Cloudflare R2.
2. After 2 weeks of zero issues:
   - Check `migration_map.jsonl` or `migration_map` collection for all verified `public_id`s.
   - Use the Cloudinary Admin Console or API script to delete assets in bulk:
     ```python
     # Example cleanup script (run ONLY after 2+ weeks of successful operation):
     # import cloudinary.api
     # cloudinary.api.delete_resources(list_of_public_ids)
     ```
