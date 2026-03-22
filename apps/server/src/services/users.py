"""User service — CRUD with email uniqueness validation."""

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.users import User, UserCreate, UserUpdate
from repositories import users as repo


class UserService:
    async def create(
        self, db: AsyncIOMotorDatabase, tenant_id: str, body: UserCreate
    ) -> User | None | str:
        """Returns User, or 'email_conflict' if email already exists."""
        existing = await repo.get_user_by_email(db, tenant_id, body.email)
        if existing:
            return "email_conflict"
        data = body.model_dump()
        data["tenant_id"] = tenant_id
        doc_id = await repo.create_user(db, data)
        return await repo.get_user(db, tenant_id, str(doc_id))

    async def list(
        self, db: AsyncIOMotorDatabase, tenant_id: str, skip: int = 0, limit: int = 50
    ) -> list[User]:
        return await repo.list_users(db, tenant_id, skip, limit)

    async def get(
        self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
    ) -> User | None:
        return await repo.get_user(db, tenant_id, user_id)

    async def update(
        self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, body: UserUpdate
    ) -> User | None:
        updates = body.model_dump(exclude_unset=True)
        if not updates:
            return None
        ok = await repo.update_user(db, tenant_id, user_id, updates)
        if not ok:
            return None
        return await repo.get_user(db, tenant_id, user_id)

    async def delete(
        self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
    ) -> bool:
        return await repo.delete_user(db, tenant_id, user_id)
