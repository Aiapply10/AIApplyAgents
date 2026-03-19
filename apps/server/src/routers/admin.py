"""Admin endpoints — audit events, notifications, and system stats."""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Query

from dependencies import AdminUser, DB, ManagerUser, Pagination, TenantId
from models.audit import AuditEvent, Notification, NotificationCreate
from repositories import audit as audit_repo
from repositories import notifications as notif_repo

router = APIRouter(prefix="/admin", tags=["admin"])


# ── system stats (admin only) ──


@router.get("/stats")
async def admin_stats(
    db: DB,
    tenant_id: TenantId,
    _admin: AdminUser,
) -> dict:
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    users_count = await db.users.count_documents({"tenant_id": tenant_id})
    active_users = await db.users.count_documents(
        {"tenant_id": tenant_id, "is_active": True}
    )
    tenants_count = await db.tenants.count_documents({})
    recent_signups = await db.users.count_documents(
        {"tenant_id": tenant_id, "created_at": {"$gte": seven_days_ago}}
    )

    # Role distribution
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$role", "count": {"$sum": 1}}},
    ]
    role_dist_cursor = db.users.aggregate(pipeline)
    role_distribution = {}
    async for doc in role_dist_cursor:
        role_distribution[doc["_id"] or "member"] = doc["count"]

    # Recent signups (last 10)
    recent_users_cursor = (
        db.users.find({"tenant_id": tenant_id})
        .sort("created_at", -1)
        .limit(10)
    )
    recent_users = []
    async for u in recent_users_cursor:
        recent_users.append(
            {
                "id": str(u["_id"]),
                "display_name": u.get("display_name", ""),
                "email": u.get("email", ""),
                "role": u.get("role", "member"),
                "created_at": u.get("created_at", "").isoformat()
                if isinstance(u.get("created_at"), datetime)
                else str(u.get("created_at", "")),
            }
        )

    # Recent audit events (last 10)
    recent_events = await audit_repo.list_events(db, tenant_id, 0, 10)
    recent_audit = []
    for e in recent_events:
        recent_audit.append(
            {
                "id": str(e["_id"]),
                "actor_id": str(e.get("actor_id", "")),
                "action": e.get("action", ""),
                "resource_type": e.get("resource_type", ""),
                "resource_id": str(e.get("resource_id", "")),
                "timestamp": e.get("timestamp", "").isoformat()
                if isinstance(e.get("timestamp"), datetime)
                else str(e.get("timestamp", "")),
            }
        )

    return {
        "users_count": users_count,
        "active_users": active_users,
        "tenants_count": tenants_count,
        "recent_signups_count": recent_signups,
        "role_distribution": role_distribution,
        "recent_users": recent_users,
        "recent_audit": recent_audit,
    }


# ── audit events (manager+) ──


@router.get("/audit-events")
async def list_audit_events(
    db: DB,
    tenant_id: TenantId,
    page: Pagination,
    _manager: ManagerUser,
    resource_type: str | None = Query(None),
    resource_id: str | None = Query(None),
    actor_id: str | None = Query(None),
) -> list[AuditEvent]:
    docs = await audit_repo.list_events(
        db, tenant_id, page.skip, page.limit, resource_type, resource_id
    )
    if actor_id:
        docs = [d for d in docs if str(d.get("actor_id", "")) == actor_id]
    return [AuditEvent(**d) for d in docs]


# ── notifications (admin only) ──


@router.post("/notifications", status_code=201)
async def create_notification(
    body: NotificationCreate, db: DB, tenant_id: TenantId, _admin: AdminUser
) -> Notification:
    data = body.model_dump()
    data["tenant_id"] = tenant_id
    notif_id = await notif_repo.create_notification(db, data)
    docs = await notif_repo.list_notifications(db, tenant_id, body.user_id, 0, 1)
    for d in docs:
        if str(d["_id"]) == notif_id:
            return Notification(**d)
    from bson import ObjectId

    doc = await db.notifications.find_one({"_id": ObjectId(notif_id)})
    return Notification(**doc)


@router.get("/notifications")
async def list_notifications(
    db: DB,
    tenant_id: TenantId,
    page: Pagination,
    _manager: ManagerUser,
    user_id: str | None = Query(None),
    status: str | None = Query(None),
) -> list[Notification]:
    if user_id:
        docs = await notif_repo.list_notifications(
            db, tenant_id, user_id, page.skip, page.limit, status
        )
    else:
        query: dict = {"tenant_id": tenant_id}
        if status:
            query["status"] = status
        cursor = (
            db.notifications.find(query)
            .sort("created_at", -1)
            .skip(page.skip)
            .limit(page.limit)
        )
        docs = await cursor.to_list(length=page.limit)
    return [Notification(**d) for d in docs]


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str, db: DB, tenant_id: TenantId, _admin: AdminUser
) -> dict:
    ok = await notif_repo.mark_read(db, tenant_id, notification_id)
    if not ok:
        raise HTTPException(404, "Notification not found")
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(
    db: DB, tenant_id: TenantId, _admin: AdminUser, user_id: str = Query(...)
) -> dict:
    count = await notif_repo.mark_all_read(db, tenant_id, user_id)
    return {"ok": True, "marked": count}
