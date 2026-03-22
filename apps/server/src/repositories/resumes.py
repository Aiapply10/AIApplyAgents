"""Resume repository — CRUD on the resumes collection, scoped by tenant + user."""

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.resumes import Resume


async def create_resume(db: AsyncIOMotorDatabase, data: dict) -> str:
    now = datetime.now(timezone.utc)
    data["created_at"] = now
    data["updated_at"] = now
    result = await db.resumes.insert_one(data)
    return str(result.inserted_id)


async def get_resume(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, resume_id: str
) -> Resume | None:
    doc = await db.resumes.find_one(
        {"_id": ObjectId(resume_id), "tenant_id": tenant_id, "user_id": user_id}
    )
    return Resume(**doc) if doc else None


async def list_resumes(
    db: AsyncIOMotorDatabase,
    tenant_id: str,
    user_id: str,
    skip: int = 0,
    limit: int = 50,
) -> list[Resume]:
    cursor = (
        db.resumes.find({"tenant_id": tenant_id, "user_id": user_id})
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
    )
    return [Resume(**d) for d in await cursor.to_list(length=limit)]


async def update_resume(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, resume_id: str, updates: dict
) -> bool:
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.resumes.update_one(
        {"_id": ObjectId(resume_id), "tenant_id": tenant_id, "user_id": user_id},
        {"$set": updates},
    )
    return result.modified_count > 0


async def delete_resume(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, resume_id: str
) -> bool:
    result = await db.resumes.delete_one(
        {"_id": ObjectId(resume_id), "tenant_id": tenant_id, "user_id": user_id}
    )
    return result.deleted_count > 0
