"""ResumeService — orchestrates repository, parser, and extractor.

All methods return data or None/False — never raise HTTP exceptions.
The router is responsible for translating return values into HTTP responses.
"""

import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase

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
                   skip: int = 0, limit: int = 50) -> list[dict]:
        return await repo.list_resumes(db, tenant_id, user_id, skip, limit)

    async def get(self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str,
                  resume_id: str) -> dict | None:
        return await repo.get_resume(db, tenant_id, user_id, resume_id)

    async def create(self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str,
                     data: dict) -> dict | None:
        data["tenant_id"] = tenant_id
        data["user_id"] = user_id
        if "sections" in data:
            data["sections"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in data["sections"]]
        rid = await repo.create_resume(db, data)
        return await repo.get_resume(db, tenant_id, user_id, rid)

    async def update(self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str,
                     resume_id: str, updates: dict) -> dict | None:
        """Returns updated doc, or None if not found."""
        if "sections" in updates and updates["sections"] is not None:
            updates["sections"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in updates["sections"]]
        ok = await repo.update_resume(db, tenant_id, user_id, resume_id, updates)
        if not ok:
            return None
        return await repo.get_resume(db, tenant_id, user_id, resume_id)

    async def delete(self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str,
                     resume_id: str) -> bool:
        """Returns True if deleted, False if not found."""
        return await repo.delete_resume(db, tenant_id, user_id, resume_id)

    async def create_from_profile(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                  user_id: str) -> dict | None:
        """Returns resume doc, or None if profile not found."""
        profile = await db.user_profiles.find_one({"tenant_id": tenant_id, "user_id": user_id})
        if not profile:
            return None
        name = profile.get("full_name", "My Resume")
        sections = sections_from_profile(profile)
        return await self.create(db, tenant_id, user_id, {
            "title": f"{name}'s Resume", "target_role": "", "sections": sections, "is_default": False,
        })

    async def create_from_markdown(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                   user_id: str, title: str, target_role: str,
                                   markdown: str) -> dict | None:
        """Returns resume doc, or None if markdown yielded no sections."""
        sections = parse_markdown_to_sections(markdown)
        if not sections:
            return None
        return await self.create(db, tenant_id, user_id, {
            "title": title, "target_role": target_role, "sections": sections, "is_default": False,
        })

    async def extract_from_file(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                user_id: str, filename: str, file_bytes: bytes) -> dict | str:
        """Returns resume doc on success, or an error string on failure.

        Possible error strings:
          - "unsupported_type"
          - "file_too_large"
          - "insufficient_text"
          - "extraction_failed: <detail>"
        """
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

        sections: list[dict] = []
        for s in extracted.get("sections", []):
            s.setdefault("id", str(uuid.uuid4()))
            s.setdefault("visible", True)
            s.setdefault("content", "")
            s.setdefault("items", [])
            s.setdefault("entries", [])
            sections.append(s)

        doc = await self.create(db, tenant_id, user_id, {
            "title": extracted.get("title", filename.rsplit(".", 1)[0]),
            "target_role": extracted.get("target_role", ""),
            "sections": sections, "is_default": False,
        })

        # Backfill master sections if empty
        existing = await ms_repo.get_master_sections(db, tenant_id, user_id)
        if not existing or not existing.get("sections"):
            await ms_repo.upsert_master_sections(db, tenant_id, user_id, sections)

        return doc
