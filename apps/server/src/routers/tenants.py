"""Tenant CRUD endpoints (admin-only)."""

from fastapi import APIRouter, HTTPException

from dependencies import AdminUser, DB, Pagination
from models.tenants import Tenant, TenantCreate, TenantUpdate
from services.tenants import TenantService

router = APIRouter(prefix="/tenants", tags=["tenants"])
_svc = TenantService()


@router.post("", status_code=201)
async def create_tenant(body: TenantCreate, db: DB, _admin: AdminUser) -> Tenant:
    result = await _svc.create(db, body)
    if result == "slug_conflict":
        raise HTTPException(409, f"Tenant slug '{body.slug}' already exists")
    return result


@router.get("")
async def list_tenants(db: DB, page: Pagination, _admin: AdminUser) -> list[Tenant]:
    return await _svc.list(db, page.skip, page.limit)


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: str, db: DB, _admin: AdminUser) -> Tenant:
    tenant = await _svc.get(db, tenant_id)
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    return tenant


@router.patch("/{tenant_id}")
async def update_tenant(tenant_id: str, body: TenantUpdate, db: DB, _admin: AdminUser) -> Tenant:
    tenant = await _svc.update(db, tenant_id, body)
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    return tenant


@router.delete("/{tenant_id}", status_code=204)
async def delete_tenant(tenant_id: str, db: DB, _admin: AdminUser) -> None:
    ok = await _svc.delete(db, tenant_id)
    if not ok:
        raise HTTPException(404, "Tenant not found")
