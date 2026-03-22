"""Resume and ResumeSection models."""

from typing import Any

from pydantic import BaseModel, Field

from models.base import PyObjectId, TenantDoc

SECTION_TYPES = ("text", "list", "entries")


class ResumeSection(BaseModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=200)
    type: str = Field(pattern=r"^(text|list|entries)$")
    content: str = Field(default="", max_length=50000)
    items: list[str] = Field(default=[], max_length=200)
    entries: list[dict[str, Any]] = Field(default=[], max_length=100)
    visible: bool = True
    order: int = Field(default=0, ge=0)


class Resume(TenantDoc):
    user_id: PyObjectId
    title: str
    target_role: str = ""
    sections: list[ResumeSection] = []
    is_default: bool = False


class ResumeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    target_role: str = Field(default="", max_length=200)
    sections: list[ResumeSection] = Field(default=[], max_length=30)


class ResumeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    target_role: str | None = Field(default=None, max_length=200)
    sections: list[ResumeSection] | None = Field(default=None, max_length=30)
    is_default: bool | None = None


class MarkdownImport(BaseModel):
    title: str = Field(default="Imported Resume", min_length=1, max_length=500)
    target_role: str = Field(default="", max_length=200)
    markdown: str = Field(min_length=10, max_length=100000)
