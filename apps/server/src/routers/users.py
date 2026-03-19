"""User CRUD endpoints."""

from fastapi import APIRouter, HTTPException

from dependencies import AdminUser, DB, ManagerUser, Pagination, TenantId
from models.users import User, UserCreate, UserUpdate
from repositories import users as repo

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", status_code=201)
async def create_user(
    body: UserCreate, db: DB, tenant_id: TenantId, _admin: AdminUser
) -> User:
    existing = await repo.get_user_by_email(db, tenant_id, body.email)
    if existing:
        raise HTTPException(409, f"User with email '{body.email}' already exists")
    data = body.model_dump()
    data["tenant_id"] = tenant_id
    doc_id = await repo.create_user(db, data)
    doc = await repo.get_user(db, tenant_id, str(doc_id))
    return User(**doc)


@router.get("")
async def list_users(
    db: DB, tenant_id: TenantId, page: Pagination, _manager: ManagerUser
) -> list[User]:
    docs = await repo.list_users(db, tenant_id, page.skip, page.limit)
    return [User(**d) for d in docs]


@router.get("/{user_id}")
async def get_user(user_id: str, db: DB, tenant_id: TenantId) -> User:
    doc = await repo.get_user(db, tenant_id, user_id)
    if not doc:
        raise HTTPException(404, "User not found")
    return User(**doc)


@router.patch("/{user_id}")
async def update_user(
    user_id: str, body: UserUpdate, db: DB, tenant_id: TenantId, _admin: AdminUser
) -> User:
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(422, "No fields to update")
    ok = await repo.update_user(db, tenant_id, user_id, updates)
    if not ok:
        raise HTTPException(404, "User not found")
    doc = await repo.get_user(db, tenant_id, user_id)
    return User(**doc)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str, db: DB, tenant_id: TenantId, _admin: AdminUser
) -> None:
    ok = await repo.delete_user(db, tenant_id, user_id)
    if not ok:
        raise HTTPException(404, "User not found")
