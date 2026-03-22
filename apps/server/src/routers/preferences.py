"""Job preference endpoints."""

from fastapi import APIRouter, HTTPException

from dependencies import DB, TenantId
from models.preferences import JobPreference, JobPreferenceUpsert
from repositories import preferences as repo

router = APIRouter(prefix="/users/{user_id}/preferences", tags=["preferences"])


@router.put("")
async def upsert_preferences(
    user_id: str, body: JobPreferenceUpsert, db: DB, tenant_id: TenantId
) -> JobPreference:
    await repo.upsert_preference(db, tenant_id, user_id, body.model_dump())
    pref = await repo.get_preference(db, tenant_id, user_id)
    if not pref:
        raise HTTPException(500, "Failed to upsert preferences")
    return pref


@router.get("")
async def get_preferences(user_id: str, db: DB, tenant_id: TenantId) -> JobPreference:
    pref = await repo.get_preference(db, tenant_id, user_id)
    if not pref:
        raise HTTPException(404, "Job preferences not found")
    return pref


@router.delete("", status_code=204)
async def delete_preferences(user_id: str, db: DB, tenant_id: TenantId) -> None:
    ok = await repo.delete_preference(db, tenant_id, user_id)
    if not ok:
        raise HTTPException(404, "Job preferences not found")
