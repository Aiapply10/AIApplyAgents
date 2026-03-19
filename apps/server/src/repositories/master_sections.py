"""Master sections repository — CRUD on the master_sections collection."""

from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_master_sections(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
) -> dict | None:
    return await db.master_sections.find_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )


async def upsert_master_sections(
    db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, sections: list[dict]
) -> str:
    now = datetime.now(timezone.utc)
    result = await db.master_sections.update_one(
        {"tenant_id": tenant_id, "user_id": user_id},
        {
            "$set": {"sections": sections, "updated_at": now},
            "$setOnInsert": {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "created_at": now,
            },
        },
        upsert=True,
    )
    if result.upserted_id:
        return str(result.upserted_id)
    doc = await get_master_sections(db, tenant_id, user_id)
    return str(doc["_id"]) if doc else ""
