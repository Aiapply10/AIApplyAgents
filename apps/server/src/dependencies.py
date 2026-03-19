"""Shared FastAPI dependencies for the Control Service."""

from typing import Annotated

from fastapi import Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from supertokens_python.recipe.session import SessionContainer
from supertokens_python.recipe.session.framework.fastapi import verify_session

from db import get_db


async def get_database() -> AsyncIOMotorDatabase:
    return get_db()


async def get_session(
    session: SessionContainer = Depends(verify_session()),
) -> SessionContainer:
    return session


async def get_current_user(
    session: SessionContainer = Depends(get_session),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Resolve the MongoDB user from the SuperTokens session."""
    st_user_id = session.get_user_id()
    user = await db.users.find_one({"supertokens_user_id": st_user_id})
    if not user:
        raise HTTPException(401, "User record not found")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account deactivated")
    return user


async def get_tenant_id(
    current_user: dict = Depends(get_current_user),
) -> str:
    """Extract tenant_id from the authenticated user."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(403, "User is not assigned to a tenant")
    return str(tenant_id)


DB = Annotated[AsyncIOMotorDatabase, Depends(get_database)]
Session = Annotated[SessionContainer, Depends(get_session)]
CurrentUser = Annotated[dict, Depends(get_current_user)]
TenantId = Annotated[str, Depends(get_tenant_id)]


def require_role(*allowed_roles: str):
    """Factory returning a dependency that checks user.role against allowed_roles."""

    async def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role", "member") not in allowed_roles:
            raise HTTPException(403, "Insufficient permissions")
        return current_user

    return checker


AdminUser = Annotated[dict, Depends(require_role("admin"))]
ManagerUser = Annotated[dict, Depends(require_role("admin", "manager"))]


class PaginationParams:
    def __init__(
        self,
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=200),
    ):
        self.skip = skip
        self.limit = limit


Pagination = Annotated[PaginationParams, Depends()]
