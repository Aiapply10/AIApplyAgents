"""ResumeService — orchestrates repository, parser, and extractor."""

import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.master_sections import MasterSections
from models.profiles import UserProfile
from models.resumes import MarkdownImport, Resume, ResumeCreate, ResumeUpdate
from repositories import master_sections as ms_repo
from repositories import resumes as repo
from services.resume.extractor import (
    ExtractionError,
    extract_text_from_docx,
    extract_text_from_pdf,
    extract_with_llm,
)
from services.resume.markdown_parser import parse_markdown_to_sections, sections_from_profile


class ResumeService:

    async def list(self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str,
                   skip: int = 0, limit: int = 50) -> list[Resume]:
        return await repo.list_resumes(db, tenant_id, user_id, skip, limit)

    async def get(self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str,
                  resume_id: str) -> Resume | None:
        return await repo.get_resume(db, tenant_id, user_id, resume_id)

    async def create(self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str,
                     body: ResumeCreate) -> Resume | None:
        data = body.model_dump()
        data["tenant_id"] = tenant_id
        data["user_id"] = user_id
        data["sections"] = [s.model_dump() for s in body.sections]
        rid = await repo.create_resume(db, data)
        return await repo.get_resume(db, tenant_id, user_id, rid)

    async def update(self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str,
                     resume_id: str, body: ResumeUpdate) -> Resume | None:
        updates = body.model_dump(exclude_unset=True)
        if not updates:
            return None
        if "sections" in updates and updates["sections"] is not None:
            updates["sections"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in updates["sections"]]
        ok = await repo.update_resume(db, tenant_id, user_id, resume_id, updates)
        if not ok:
            return None
        return await repo.get_resume(db, tenant_id, user_id, resume_id)

    async def delete(self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str,
                     resume_id: str) -> bool:
        return await repo.delete_resume(db, tenant_id, user_id, resume_id)

    async def create_from_profile(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                  user_id: str) -> Resume | None:
        doc = await db.user_profiles.find_one({"tenant_id": tenant_id, "user_id": user_id})
        if not doc:
            return None
        profile = UserProfile(**doc)
        name = profile.full_name or "My Resume"
        sections = sections_from_profile(profile.model_dump())
        return await self._create_internal(db, tenant_id, user_id,
                                           f"{name}'s Resume", "", sections)

    async def create_from_markdown(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                   user_id: str, body: MarkdownImport) -> Resume | None:
        sections = parse_markdown_to_sections(body.markdown)
        if not sections:
            return None
        return await self._create_internal(db, tenant_id, user_id,
                                           body.title, body.target_role, sections)

    async def extract_from_file(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                user_id: str, filename: str, file_bytes: bytes) -> Resume | str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ("pdf", "docx"):
            return "unsupported_type"
        if len(file_bytes) > 10 * 1024 * 1024:
            return "file_too_large"

        text = extract_text_from_pdf(file_bytes) if ext == "pdf" else extract_text_from_docx(file_bytes)
        if not text or len(text.strip()) < 50:
            return "insufficient_text"

        try:
            extracted = await extract_with_llm(text)
        except ExtractionError as e:
            return f"extraction_failed: {e}"

        sections_data: list[dict] = []
        for s in extracted.get("sections", []):
            s.setdefault("id", str(uuid.uuid4()))
            s.setdefault("visible", True)
            s.setdefault("content", "")
            s.setdefault("items", [])
            s.setdefault("entries", [])
            sections_data.append(s)

        from models.resumes import ResumeSection
        sections = [ResumeSection(**s) for s in sections_data]

        resume = await self._create_internal(
            db, tenant_id, user_id,
            extracted.get("title", filename.rsplit(".", 1)[0]),
            extracted.get("target_role", ""),
            sections,
        )

        # Backfill master sections if empty
        existing: MasterSections | None = await ms_repo.get_master_sections(db, tenant_id, user_id)
        if not existing or not existing.sections:
            await ms_repo.upsert_master_sections(db, tenant_id, user_id, sections_data)

        return resume

    async def _create_internal(self, db: AsyncIOMotorDatabase, tenant_id: str,
                               user_id: str, title: str, target_role: str,
                               sections) -> Resume | None:
        """Internal helper for creating resumes from parsed/extracted data."""
        data = {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "title": title,
            "target_role": target_role,
            "sections": [s.model_dump() if hasattr(s, "model_dump") else s for s in sections],
            "is_default": False,
        }
        rid = await repo.create_resume(db, data)
        return await repo.get_resume(db, tenant_id, user_id, rid)
