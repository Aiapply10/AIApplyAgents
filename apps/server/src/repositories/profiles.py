"""Profile and Document repository — user_profiles and user_documents collections."""

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.profiles import UserDocument, UserProfile


# ── user_profiles ──


async def upsert_profile(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, data: dict
) -> str:
    now = datetime.now(timezone.utc)
    data.update(tenant_id=tenant_id, user_id=user_id, updated_at=now)
    result = await db.user_profiles.update_one(
        {"tenant_id": tenant_id, "user_id": user_id},
        {"$set": data, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    if result.upserted_id:
        return str(result.upserted_id)
    doc = await db.user_profiles.find_one({"tenant_id": tenant_id, "user_id": user_id})
    return str(doc["_id"]) if doc else ""


async def get_profile(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> UserProfile | None:
    doc = await db.user_profiles.find_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )
    return UserProfile(**doc) if doc else None


async def delete_profile(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> bool:
    result = await db.user_profiles.delete_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )
    return result.deleted_count > 0


# ── user_documents ──


async def create_document(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, data: dict
) -> str:
    now = datetime.now(timezone.utc)
    data.update(tenant_id=tenant_id, user_id=user_id, created_at=now, updated_at=now)
    result = await db.user_documents.insert_one(data)
    return str(result.inserted_id)


async def get_document(
    db: AsyncIOMotorDatabase, tenant_id: str, doc_id: str
) -> UserDocument | None:
    doc = await db.user_documents.find_one(
        {"_id": ObjectId(doc_id), "tenant_id": tenant_id}
    )
    return UserDocument(**doc) if doc else None


async def list_documents(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> list[UserDocument]:
    cursor = db.user_documents.find({"tenant_id": tenant_id, "user_id": user_id})
    return [UserDocument(**d) for d in await cursor.to_list(length=100)]


async def delete_document(
    db: AsyncIOMotorDatabase, tenant_id: str, doc_id: str
) -> bool:
    result = await db.user_documents.delete_one(
        {"_id": ObjectId(doc_id), "tenant_id": tenant_id}
    )
    return result.deleted_count > 0
