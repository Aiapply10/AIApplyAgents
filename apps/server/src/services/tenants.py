"""Tenant service — CRUD with slug uniqueness validation."""

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.tenants import Tenant, TenantCreate, TenantUpdate
from repositories import tenants as repo


class TenantService:
    async def create(
        self, db: AsyncIOMotorDatabase, body: TenantCreate
    ) -> Tenant | None | str:
        """Returns Tenant, or 'slug_conflict' if slug already exists."""
        existing = await repo.get_tenant_by_slug(db, body.slug)
        if existing:
            return "slug_conflict"
        doc_id = await repo.create_tenant(db, body.model_dump())
        return await repo.get_tenant(db, doc_id)

    async def list(
        self, db: AsyncIOMotorDatabase, skip: int = 0, limit: int = 50
    ) -> list[Tenant]:
        return await repo.list_tenants(db, skip, limit)

    async def get(self, db: AsyncIOMotorDatabase, tenant_id: str) -> Tenant | None:
        return await repo.get_tenant(db, tenant_id)

    async def update(
        self, db: AsyncIOMotorDatabase, tenant_id: str, body: TenantUpdate
    ) -> Tenant | None:
        updates = body.model_dump(exclude_unset=True)
        if not updates:
            return None
        ok = await repo.update_tenant(db, tenant_id, updates)
        if not ok:
            return None
        return await repo.get_tenant(db, tenant_id)

    async def delete(self, db: AsyncIOMotorDatabase, tenant_id: str) -> bool:
        return await repo.delete_tenant(db, tenant_id)
