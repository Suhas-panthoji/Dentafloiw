"""Schema coverage contract for the backup service."""

COVERED_COLLECTIONS = {"patients", "treatments"}
EXCLUDED_COLLECTIONS = {"users", "sessions", "password_history", "usage_counters", "backup_events"}


async def assert_collection_coverage(database):
    """Reject unclassified collections instead of silently omitting clinical data."""
    collections = set(await database.list_collection_names())
    unknown = collections - COVERED_COLLECTIONS - EXCLUDED_COLLECTIONS
    if unknown:
        raise RuntimeError("Backup coverage missing for collections: " + ", ".join(sorted(unknown)))
