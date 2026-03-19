"""Automation policy endpoints."""

from fastapi import APIRouter, HTTPException

from dependencies import DB, TenantId
from models.preferences import AutomationPolicy, AutomationPolicyUpsert
from repositories import preferences as repo

router = APIRouter(prefix="/users/{user_id}/policies", tags=["policies"])


@router.put("")
async def upsert_policy(
    user_id: str, body: AutomationPolicyUpsert, db: DB, tenant_id: TenantId
) -> AutomationPolicy:
    await repo.upsert_policy(db, tenant_id, user_id, body.model_dump())
    doc = await repo.get_policy(db, tenant_id, user_id)
    return AutomationPolicy(**doc)


@router.get("")
async def get_policy(
    user_id: str, db: DB, tenant_id: TenantId
) -> AutomationPolicy:
    doc = await repo.get_policy(db, tenant_id, user_id)
    if not doc:
        raise HTTPException(404, "Automation policy not found")
    return AutomationPolicy(**doc)


@router.delete("", status_code=204)
async def delete_policy(
    user_id: str, db: DB, tenant_id: TenantId
) -> None:
    ok = await repo.delete_policy(db, tenant_id, user_id)
    if not ok:
        raise HTTPException(404, "Automation policy not found")
