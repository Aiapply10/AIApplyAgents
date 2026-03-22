"""Admin endpoints — audit events, notifications, and system stats."""

from fastapi import APIRouter, HTTPException, Query

from dependencies import AdminUser, DB, ManagerUser, Pagination, TenantId
from models.audit import AuditEvent, Notification, NotificationCreate
from services.admin import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])
_svc = AdminService()


@router.get("/stats")
async def admin_stats(db: DB, tenant_id: TenantId, _admin: AdminUser) -> dict:
    return await _svc.get_stats(db, tenant_id)


@router.get("/audit-events")
async def list_audit_events(
    db: DB, tenant_id: TenantId, page: Pagination, _manager: ManagerUser,
    resource_type: str | None = Query(None),
    resource_id: str | None = Query(None),
    actor_id: str | None = Query(None),
) -> list[AuditEvent]:
    return await _svc.list_audit_events(db, tenant_id, page.skip, page.limit,
                                        resource_type, resource_id, actor_id)


@router.post("/notifications", status_code=201)
async def create_notification(
    body: NotificationCreate, db: DB, tenant_id: TenantId, _admin: AdminUser
) -> Notification:
    notif = await _svc.create_notification(db, tenant_id, body)
    if not notif:
        raise HTTPException(500, "Failed to create notification")
    return notif


@router.get("/notifications")
async def list_notifications(
    db: DB, tenant_id: TenantId, page: Pagination, _manager: ManagerUser,
    user_id: str | None = Query(None), status: str | None = Query(None),
) -> list[Notification]:
    return await _svc.list_notifications(db, tenant_id, page.skip, page.limit, user_id, status)


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str, db: DB, tenant_id: TenantId, _admin: AdminUser
) -> dict:
    ok = await _svc.mark_notification_read(db, tenant_id, notification_id)
    if not ok:
        raise HTTPException(404, "Notification not found")
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(
    db: DB, tenant_id: TenantId, _admin: AdminUser, user_id: str = Query(...)
) -> dict:
    count = await _svc.mark_all_notifications_read(db, tenant_id, user_id)
    return {"ok": True, "marked": count}
