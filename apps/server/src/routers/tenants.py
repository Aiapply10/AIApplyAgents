"""Tenant CRUD endpoints (admin-only)."""

from fastapi import APIRouter, HTTPException

from dependencies import AdminUser, DB, Pagination
from models.tenants import Tenant, TenantCreate, TenantUpdate
from repositories import tenants as repo

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("", status_code=201)
async def create_tenant(body: TenantCreate, db: DB, _admin: AdminUser) -> Tenant:
    existing = await repo.get_tenant_by_slug(db, body.slug)
    if existing:
        raise HTTPException(409, f"Tenant slug '{body.slug}' already exists")
    doc_id = await repo.create_tenant(db, body.model_dump())
    doc = await repo.get_tenant(db, doc_id)
    return Tenant(**doc)


@router.get("")
async def list_tenants(db: DB, page: Pagination, _admin: AdminUser) -> list[Tenant]:
    docs = await repo.list_tenants(db, page.skip, page.limit)
    return [Tenant(**d) for d in docs]


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: str, db: DB, _admin: AdminUser) -> Tenant:
    doc = await repo.get_tenant(db, tenant_id)
    if not doc:
        raise HTTPException(404, "Tenant not found")
    return Tenant(**doc)


@router.patch("/{tenant_id}")
async def update_tenant(
    tenant_id: str, body: TenantUpdate, db: DB, _admin: AdminUser
) -> Tenant:
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(422, "No fields to update")
    ok = await repo.update_tenant(db, tenant_id, updates)
    if not ok:
        raise HTTPException(404, "Tenant not found")
    doc = await repo.get_tenant(db, tenant_id)
    return Tenant(**doc)


@router.delete("/{tenant_id}", status_code=204)
async def delete_tenant(tenant_id: str, db: DB, _admin: AdminUser) -> None:
    ok = await repo.delete_tenant(db, tenant_id)
    if not ok:
        raise HTTPException(404, "Tenant not found")
