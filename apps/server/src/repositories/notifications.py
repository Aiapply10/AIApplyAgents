"""Notification repository — notifications collection."""

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.audit import Notification


async def create_notification(db: AsyncIOMotorDatabase, data: dict) -> str:
    now = datetime.now(timezone.utc)
    data["created_at"] = now
    data["updated_at"] = now
    result = await db.notifications.insert_one(data)
    return str(result.inserted_id)


async def list_notifications(
    db: AsyncIOMotorDatabase,
    tenant_id: str,
    user_id: str,
    skip: int,
    limit: int,
    status: str | None = None,
) -> list[Notification]:
    query: dict = {"tenant_id": tenant_id, "user_id": user_id}
    if status:
        query["status"] = status
    cursor = (
        db.notifications.find(query).sort("created_at", -1).skip(skip).limit(limit)
    )
    return [Notification(**d) for d in await cursor.to_list(length=limit)]


async def count_notifications(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, status: str | None = None
) -> int:
    query: dict = {"tenant_id": tenant_id, "user_id": user_id}
    if status:
        query["status"] = status
    return await db.notifications.count_documents(query)


async def mark_read(
    db: AsyncIOMotorDatabase, tenant_id: str, notification_id: str
) -> bool:
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "tenant_id": tenant_id},
        {"$set": {"status": "read", "updated_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


async def mark_all_read(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> int:
    result = await db.notifications.update_many(
        {"tenant_id": tenant_id, "user_id": user_id, "status": "unread"},
        {"$set": {"status": "read", "updated_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count
