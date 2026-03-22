"""Audit repository — audit_events collection."""

from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.audit import AuditEvent


async def create_event(db: AsyncIOMotorDatabase, data: dict) -> str:
    data.setdefault("timestamp", datetime.now(timezone.utc))
    data.setdefault("created_at", datetime.now(timezone.utc))
    data.setdefault("updated_at", datetime.now(timezone.utc))
    result = await db.audit_events.insert_one(data)
    return str(result.inserted_id)


async def list_events(
    db: AsyncIOMotorDatabase,
    tenant_id: str,
    skip: int,
    limit: int,
    resource_type: str | None = None,
    resource_id: str | None = None,
) -> list[AuditEvent]:
    query: dict = {"tenant_id": tenant_id}
    if resource_type:
        query["resource_type"] = resource_type
    if resource_id:
        query["resource_id"] = resource_id
    cursor = (
        db.audit_events.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    )
    return [AuditEvent(**d) for d in await cursor.to_list(length=limit)]


async def count_events(
    db: AsyncIOMotorDatabase,
    tenant_id: str,
    resource_type: str | None = None,
) -> int:
    query: dict = {"tenant_id": tenant_id}
    if resource_type:
        query["resource_type"] = resource_type
    return await db.audit_events.count_documents(query)
