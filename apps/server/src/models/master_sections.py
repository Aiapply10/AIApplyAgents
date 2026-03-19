"""Master sections model — single source of truth for a user's career data."""

from typing import Any

from pydantic import BaseModel

from models.base import PyObjectId, TenantDoc
from models.resumes import ResumeSection


class MasterSections(TenantDoc):
    user_id: PyObjectId
    sections: list[ResumeSection] = []


class MasterSectionsUpdate(BaseModel):
    sections: list[ResumeSection]


class TailorRequest(BaseModel):
    target_role: str
    job_description: str = ""
    title: str = ""
