"""Tenant repository — CRUD operations on the tenants collection."""

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


async def create_tenant(db: AsyncIOMotorDatabase, data: dict) -> str:
    data["created_at"] = datetime.now(timezone.utc)
    data["updated_at"] = datetime.now(timezone.utc)
    result = await db.tenants.insert_one(data)
    return str(result.inserted_id)


async def get_tenant(db: AsyncIOMotorDatabase, tenant_id: str) -> dict | None:
    return await db.tenants.find_one({"_id": ObjectId(tenant_id)})


async def get_tenant_by_slug(db: AsyncIOMotorDatabase, slug: str) -> dict | None:
    return await db.tenants.find_one({"slug": slug})


async def list_tenants(db: AsyncIOMotorDatabase, skip: int, limit: int) -> list[dict]:
    cursor = db.tenants.find().skip(skip).limit(limit)
    return await cursor.to_list(length=limit)


async def update_tenant(db: AsyncIOMotorDatabase, tenant_id: str, updates: dict) -> bool:
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)}, {"$set": updates}
    )
    return result.modified_count > 0


async def delete_tenant(db: AsyncIOMotorDatabase, tenant_id: str) -> bool:
    result = await db.tenants.delete_one({"_id": ObjectId(tenant_id)})
    return result.deleted_count > 0
