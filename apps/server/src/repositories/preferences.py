"""Preferences and Policies repository — job_preferences and automation_policies."""

from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase


# ── job_preferences ──


async def upsert_preference(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, data: dict
) -> str:
    now = datetime.now(timezone.utc)
    data.update(tenant_id=tenant_id, user_id=user_id, updated_at=now)
    result = await db.job_preferences.update_one(
        {"tenant_id": tenant_id, "user_id": user_id},
        {"$set": data, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    if result.upserted_id:
        return str(result.upserted_id)
    doc = await db.job_preferences.find_one({"tenant_id": tenant_id, "user_id": user_id})
    return str(doc["_id"]) if doc else ""


async def get_preference(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> dict | None:
    return await db.job_preferences.find_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )


async def delete_preference(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> bool:
    result = await db.job_preferences.delete_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )
    return result.deleted_count > 0


# ── automation_policies ──


async def upsert_policy(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, data: dict
) -> str:
    now = datetime.now(timezone.utc)
    data.update(tenant_id=tenant_id, user_id=user_id, updated_at=now)
    result = await db.automation_policies.update_one(
        {"tenant_id": tenant_id, "user_id": user_id},
        {"$set": data, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    if result.upserted_id:
        return str(result.upserted_id)
    doc = await db.automation_policies.find_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )
    return str(doc["_id"]) if doc else ""


async def get_policy(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> dict | None:
    return await db.automation_policies.find_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )


async def delete_policy(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> bool:
    result = await db.automation_policies.delete_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )
    return result.deleted_count > 0
