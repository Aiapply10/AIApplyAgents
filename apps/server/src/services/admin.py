"""Admin service — stats aggregation, audit, and notifications."""

from datetime import datetime, timedelta, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.audit import AuditEvent, Notification, NotificationCreate
from repositories import audit as audit_repo
from repositories import notifications as notif_repo


def _serialize_dt(val) -> str:
    if isinstance(val, datetime):
        return val.isoformat()
    return str(val or "")


class AdminService:

    async def get_stats(self, db: AsyncIOMotorDatabase, tenant_id: str) -> dict:
        now = datetime.now(timezone.utc)
        seven_days_ago = now - timedelta(days=7)

        users_count = await db.users.count_documents({"tenant_id": tenant_id})
        active_users = await db.users.count_documents({"tenant_id": tenant_id, "is_active": True})
        tenants_count = await db.tenants.count_documents({})
        recent_signups = await db.users.count_documents(
            {"tenant_id": tenant_id, "created_at": {"$gte": seven_days_ago}}
        )

        pipeline = [
            {"$match": {"tenant_id": tenant_id}},
            {"$group": {"_id": "$role", "count": {"$sum": 1}}},
        ]
        role_distribution = {}
        async for doc in db.users.aggregate(pipeline):
            role_distribution[doc["_id"] or "member"] = doc["count"]

        recent_users_cursor = (
            db.users.find({"tenant_id": tenant_id}).sort("created_at", -1).limit(10)
        )
        recent_users = []
        async for u in recent_users_cursor:
            recent_users.append({
                "id": str(u["_id"]),
                "display_name": u.get("display_name", ""),
                "email": u.get("email", ""),
                "role": u.get("role", "member"),
                "created_at": _serialize_dt(u.get("created_at")),
            })

        recent_events: list[AuditEvent] = await audit_repo.list_events(db, tenant_id, 0, 10)
        recent_audit = []
        for e in recent_events:
            recent_audit.append({
                "id": e.id,
                "actor_id": str(e.actor_id or ""),
                "action": e.action,
                "resource_type": e.resource_type,
                "resource_id": str(e.resource_id),
                "timestamp": _serialize_dt(e.timestamp),
            })

        return {
            "users_count": users_count,
            "active_users": active_users,
            "tenants_count": tenants_count,
            "recent_signups_count": recent_signups,
            "role_distribution": role_distribution,
            "recent_users": recent_users,
            "recent_audit": recent_audit,
        }

    async def list_audit_events(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                skip: int, limit: int, resource_type: str | None = None,
                                resource_id: str | None = None,
                                actor_id: str | None = None) -> list[AuditEvent]:
        events = await audit_repo.list_events(db, tenant_id, skip, limit, resource_type, resource_id)
        if actor_id:
            events = [e for e in events if str(e.actor_id or "") == actor_id]
        return events

    async def create_notification(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                  body: NotificationCreate) -> Notification | None:
        data = body.model_dump()
        data["tenant_id"] = tenant_id
        notif_id = await notif_repo.create_notification(db, data)
        doc = await db.notifications.find_one({"_id": ObjectId(notif_id)})
        return Notification(**doc) if doc else None

    async def list_notifications(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                 skip: int, limit: int, user_id: str | None = None,
                                 status: str | None = None) -> list[Notification]:
        if user_id:
            return await notif_repo.list_notifications(db, tenant_id, user_id, skip, limit, status)
        query: dict = {"tenant_id": tenant_id}
        if status:
            query["status"] = status
        cursor = db.notifications.find(query).sort("created_at", -1).skip(skip).limit(limit)
        return [Notification(**d) for d in await cursor.to_list(length=limit)]

    async def mark_notification_read(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                     notification_id: str) -> bool:
        return await notif_repo.mark_read(db, tenant_id, notification_id)

    async def mark_all_notifications_read(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                          user_id: str) -> int:
        return await notif_repo.mark_all_read(db, tenant_id, user_id)
