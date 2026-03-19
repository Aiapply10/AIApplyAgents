"""Foundation types for MongoDB documents."""

from datetime import datetime, timezone
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class MongoDoc(BaseModel):
    """Base for all documents read from MongoDB."""

    model_config = ConfigDict(populate_by_name=True)

    id: PyObjectId | None = Field(alias="_id", default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TenantDoc(MongoDoc):
    """Base for tenant-scoped documents."""

    tenant_id: PyObjectId


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
