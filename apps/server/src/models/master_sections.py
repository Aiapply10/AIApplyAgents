"""Master sections model — single source of truth for a user's career data."""

from pydantic import BaseModel, Field

from models.base import PyObjectId, TenantDoc
from models.resumes import ResumeSection


class MasterSections(TenantDoc):
    user_id: PyObjectId
    sections: list[ResumeSection] = []


class MasterSectionsUpdate(BaseModel):
    sections: list[ResumeSection] = Field(max_length=30)


class TailorRequest(BaseModel):
    target_role: str = Field(min_length=1, max_length=200)
    job_description: str = Field(default="", max_length=50000)
    title: str = Field(default="", max_length=500)
