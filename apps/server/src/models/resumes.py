"""Resume and ResumeSection models."""

from typing import Any

from pydantic import BaseModel

from models.base import PyObjectId, TenantDoc


class ResumeSection(BaseModel):
    id: str  # client-generated uuid
    title: str
    type: str  # "text", "list", "entries"
    content: str = ""  # for text type
    items: list[str] = []  # for list type
    entries: list[dict[str, Any]] = []  # for entries type
    visible: bool = True
    order: int = 0


class Resume(TenantDoc):
    user_id: PyObjectId
    title: str
    target_role: str = ""
    sections: list[ResumeSection] = []
    is_default: bool = False


class ResumeCreate(BaseModel):
    title: str
    target_role: str = ""
    sections: list[ResumeSection] = []


class ResumeUpdate(BaseModel):
    title: str | None = None
    target_role: str | None = None
    sections: list[ResumeSection] | None = None
    is_default: bool | None = None


class MarkdownImport(BaseModel):
    title: str = "Imported Resume"
    target_role: str = ""
    markdown: str
