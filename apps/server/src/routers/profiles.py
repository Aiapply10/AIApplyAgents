"""User profile and document endpoints."""

from fastapi import APIRouter, HTTPException

from dependencies import DB, TenantId
from models.profiles import (
    UserDocument,
    UserDocumentCreate,
    UserProfile,
    UserProfileUpsert,
)
from repositories import profiles as repo

router = APIRouter(prefix="/users/{user_id}", tags=["profiles"])


# ── profile ──


@router.put("/profile")
async def upsert_profile(
    user_id: str, body: UserProfileUpsert, db: DB, tenant_id: TenantId
) -> UserProfile:
    await repo.upsert_profile(db, tenant_id, user_id, body.model_dump())
    profile = await repo.get_profile(db, tenant_id, user_id)
    if not profile:
        raise HTTPException(500, "Failed to upsert profile")
    return profile


@router.get("/profile")
async def get_profile(user_id: str, db: DB, tenant_id: TenantId) -> UserProfile:
    profile = await repo.get_profile(db, tenant_id, user_id)
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile


@router.delete("/profile", status_code=204)
async def delete_profile(user_id: str, db: DB, tenant_id: TenantId) -> None:
    ok = await repo.delete_profile(db, tenant_id, user_id)
    if not ok:
        raise HTTPException(404, "Profile not found")


# ── documents ──


@router.post("/documents", status_code=201)
async def create_document(
    user_id: str, body: UserDocumentCreate, db: DB, tenant_id: TenantId
) -> UserDocument:
    doc_id = await repo.create_document(db, tenant_id, user_id, body.model_dump())
    document = await repo.get_document(db, tenant_id, doc_id)
    if not document:
        raise HTTPException(500, "Failed to create document")
    return document


@router.get("/documents")
async def list_documents(
    user_id: str, db: DB, tenant_id: TenantId
) -> list[UserDocument]:
    return await repo.list_documents(db, tenant_id, user_id)


@router.get("/documents/{doc_id}")
async def get_document(
    user_id: str, doc_id: str, db: DB, tenant_id: TenantId
) -> UserDocument:
    document = await repo.get_document(db, tenant_id, doc_id)
    if not document:
        raise HTTPException(404, "Document not found")
    return document


@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(
    user_id: str, doc_id: str, db: DB, tenant_id: TenantId
) -> None:
    ok = await repo.delete_document(db, tenant_id, doc_id)
    if not ok:
        raise HTTPException(404, "Document not found")
