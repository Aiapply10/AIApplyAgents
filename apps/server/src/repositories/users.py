"""User repository — CRUD operations on the users collection."""

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.users import User


async def create_user(db: AsyncIOMotorDatabase, data: dict) -> str:
    data["created_at"] = datetime.now(timezone.utc)
    data["updated_at"] = datetime.now(timezone.utc)
    result = await db.users.insert_one(data)
    return str(result.inserted_id)


async def get_user(db: AsyncIOMotorDatabase, tenant_id: str, user_id: str) -> User | None:
    doc = await db.users.find_one({"_id": ObjectId(user_id), "tenant_id": tenant_id})
    return User(**doc) if doc else None


async def get_user_by_supertokens_id(
    db: AsyncIOMotorDatabase, supertokens_user_id: str
) -> User | None:
    doc = await db.users.find_one({"supertokens_user_id": supertokens_user_id})
    return User(**doc) if doc else None


async def get_user_by_email(
    db: AsyncIOMotorDatabase, tenant_id: str, email: str
) -> User | None:
    doc = await db.users.find_one({"tenant_id": tenant_id, "email": email})
    return User(**doc) if doc else None


async def list_users(
    db: AsyncIOMotorDatabase, tenant_id: str, skip: int, limit: int
) -> list[User]:
    cursor = db.users.find({"tenant_id": tenant_id}).skip(skip).limit(limit)
    return [User(**d) for d in await cursor.to_list(length=limit)]


async def count_users(db: AsyncIOMotorDatabase, tenant_id: str) -> int:
    return await db.users.count_documents({"tenant_id": tenant_id})


async def update_user(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, updates: dict
) -> bool:
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.users.update_one(
        {"_id": ObjectId(user_id), "tenant_id": tenant_id}, {"$set": updates}
    )
    return result.modified_count > 0


async def delete_user(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> bool:
    result = await db.users.delete_one(
        {"_id": ObjectId(user_id), "tenant_id": tenant_id}
    )
    return result.deleted_count > 0
