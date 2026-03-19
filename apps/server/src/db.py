"""MongoDB connection via motor and index management."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def init_db(uri: str, db_name: str) -> None:
    global _client, _db
    _client = AsyncIOMotorClient(uri)
    _db = _client[db_name]
    await ensure_indexes(_db)


async def close_db() -> None:
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialised — call init_db first")
    return _db


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create indexes idempotently at startup."""

    await db.tenants.create_indexes([
        IndexModel([("slug", ASCENDING)], unique=True),
    ])

    await db.users.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("email", ASCENDING)], unique=True),
        IndexModel([("tenant_id", ASCENDING)]),
        IndexModel([("supertokens_user_id", ASCENDING)], unique=True),
    ])

    await db.user_profiles.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING)], unique=True),
    ])

    await db.user_documents.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING), ("doc_type", ASCENDING)]),
    ])

    await db.job_preferences.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING)], unique=True),
    ])

    await db.automation_policies.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING)], unique=True),
    ])

    await db.job_sources.create_indexes([
        IndexModel([("tenant_id", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("platform", ASCENDING)]),
    ])

    await db.job_postings.create_indexes([
        IndexModel(
            [("tenant_id", ASCENDING), ("source_id", ASCENDING), ("external_id", ASCENDING)],
            unique=True,
        ),
        IndexModel([("tenant_id", ASCENDING), ("company", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("created_at", ASCENDING)]),
    ])

    await db.job_matches.create_indexes([
        IndexModel(
            [("tenant_id", ASCENDING), ("user_id", ASCENDING), ("posting_id", ASCENDING)],
            unique=True,
        ),
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING), ("status", ASCENDING)]),
    ])

    await db.fetch_runs.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("source_id", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("status", ASCENDING)]),
    ])

    await db.workflow_runs.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("status", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("created_at", ASCENDING)]),
    ])

    await db.task_runs.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("workflow_run_id", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("status", ASCENDING)]),
    ])

    await db.application_runs.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("status", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("match_id", ASCENDING)]),
    ])

    await db.application_attempts.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("application_run_id", ASCENDING)]),
    ])

    await db.artifacts.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("parent_type", ASCENDING), ("parent_id", ASCENDING)]),
    ])

    await db.audit_events.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("timestamp", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("resource_type", ASCENDING), ("resource_id", ASCENDING)]),
    ])

    await db.notifications.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING), ("status", ASCENDING)]),
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING), ("created_at", ASCENDING)]),
    ])

    await db.resumes.create_indexes([
        IndexModel([("tenant_id", ASCENDING), ("user_id", ASCENDING)]),
    ])
