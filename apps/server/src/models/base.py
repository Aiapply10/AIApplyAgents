"""Foundation types for MongoDB documents."""

from datetime import datetime, timezone
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, model_validator

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class MongoDoc(BaseModel):
    """Base for all documents read from MongoDB.

    Accepts both `_id` (from MongoDB) and `id` (from API). Serializes as `id`.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: PyObjectId | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data: Any) -> Any:
        """Map MongoDB's _id to id."""
        if isinstance(data, dict) and "_id" in data:
            data["id"] = data.pop("_id")
        return data


class TenantDoc(MongoDoc):
    """Base for tenant-scoped documents."""

    tenant_id: PyObjectId


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
