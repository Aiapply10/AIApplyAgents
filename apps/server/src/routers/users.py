"""User CRUD endpoints."""

from fastapi import APIRouter, HTTPException

from dependencies import AdminUser, DB, ManagerUser, Pagination, TenantId
from models.users import User, UserCreate, UserUpdate
from services.users import UserService

router = APIRouter(prefix="/users", tags=["users"])
_svc = UserService()


@router.post("", status_code=201)
async def create_user(body: UserCreate, db: DB, tenant_id: TenantId, _admin: AdminUser) -> User:
    result = await _svc.create(db, tenant_id, body)
    if result == "email_conflict":
        raise HTTPException(409, f"User with email '{body.email}' already exists")
    return result


@router.get("")
async def list_users(db: DB, tenant_id: TenantId, page: Pagination, _manager: ManagerUser) -> list[User]:
    return await _svc.list(db, tenant_id, page.skip, page.limit)


@router.get("/{user_id}")
async def get_user(user_id: str, db: DB, tenant_id: TenantId) -> User:
    user = await _svc.get(db, tenant_id, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.patch("/{user_id}")
async def update_user(user_id: str, body: UserUpdate, db: DB, tenant_id: TenantId, _admin: AdminUser) -> User:
    user = await _svc.update(db, tenant_id, user_id, body)
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str, db: DB, tenant_id: TenantId, _admin: AdminUser) -> None:
    ok = await _svc.delete(db, tenant_id, user_id)
    if not ok:
        raise HTTPException(404, "User not found")
