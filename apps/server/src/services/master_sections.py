"""Master sections service — career data repo, import merge, and AI tailoring."""

import json
import re
import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.master_sections import MasterSections, MasterSectionsUpdate
from models.resumes import Resume
from repositories import master_sections as repo
from repositories import resumes as resume_repo


class TailorError(Exception):
    """Raised when AI tailoring fails."""


def _section_has_content(s: dict) -> bool:
    if s.get("content", "").strip():
        return True
    if s.get("items"):
        return True
    if s.get("entries"):
        return True
    return False


class MasterSectionsService:
    async def get(
        self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str
    ) -> MasterSections | None:
        return await repo.get_master_sections(db, tenant_id, user_id)

    async def upsert(
        self,
        db: AsyncIOMotorDatabase,
        tenant_id: str,
        user_id: str,
        body: MasterSectionsUpdate,
    ) -> MasterSections | None:
        sections = [s.model_dump() for s in body.sections]
        await repo.upsert_master_sections(db, tenant_id, user_id, sections)
        return await repo.get_master_sections(db, tenant_id, user_id)

    async def import_from_resume(
        self, db: AsyncIOMotorDatabase, tenant_id: str, user_id: str, resume_id: str
    ) -> MasterSections | None | str:
        """Returns updated MasterSections, or an error string.

        Error strings: "resume_not_found", "no_sections"
        """
        resume: Resume | None = await resume_repo.get_resume(
            db, tenant_id, user_id, resume_id
        )
        if not resume:
            return "resume_not_found"

        imported = [s.model_dump() for s in resume.sections]
        if not imported:
            return "no_sections"

        existing = await repo.get_master_sections(db, tenant_id, user_id)
        existing_sections: list[dict] = (
            [s.model_dump() for s in existing.sections] if existing else []
        )

        existing_by_title: dict[str, dict] = {}
        for s in existing_sections:
            existing_by_title[s.get("title", "")] = s

        merged: list[dict] = []
        seen_titles: set[str] = set()

        for s in imported:
            title = s.get("title", "")
            seen_titles.add(title)
            old = existing_by_title.get(title)
            if old and _section_has_content(old):
                merged.append(old)
            else:
                merged.append(s)

        for s in existing_sections:
            if s.get("title", "") not in seen_titles:
                merged.append(s)

        await repo.upsert_master_sections(db, tenant_id, user_id, merged)
        return await repo.get_master_sections(db, tenant_id, user_id)

    async def tailor_resume(
        self,
        db: AsyncIOMotorDatabase,
        tenant_id: str,
        user_id: str,
        target_role: str,
        job_description: str,
        title: str | None = None,
    ) -> dict | str:
        """Returns a resume data dict ready for creation, or an error string.

        Error strings: "no_master_sections", "tailor_failed: <detail>"
        """
        doc = await repo.get_master_sections(db, tenant_id, user_id)
        if not doc or not doc.sections:
            return "no_master_sections"

        master_json = json.dumps([s.model_dump() for s in doc.sections], default=str)

        try:
            tailored = await _tailor_with_llm(master_json, target_role, job_description)
        except TailorError as e:
            return f"tailor_failed: {e}"

        sections: list[dict] = []
        for s in tailored.get("sections", []):
            s.setdefault("id", str(uuid.uuid4()))
            s.setdefault("visible", True)
            s.setdefault("content", "")
            s.setdefault("items", [])
            s.setdefault("entries", [])
            sections.append(s)

        return {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "title": title or tailored.get("title", f"Resume — {target_role}"),
            "target_role": target_role,
            "sections": sections,
            "is_default": False,
        }


# ── LLM integration ──

_TAILOR_PROMPT = """\
You are a professional resume tailoring expert. Given a user's complete career data \
(master sections) and a target role, create a tailored resume that maximizes their \
chances of getting an interview for that specific role.

Return ONLY valid JSON, no markdown fences, no explanation.

Rules:
- SELECT the most relevant entries from each section for the target role.
- REWRITE bullet points and descriptions to emphasize skills/achievements relevant to the target role.
- REORDER sections to put the most impactful content first for this role.
- For Skills, select and regroup categories relevant to the target role.
- For Experience, rewrite descriptions to highlight relevant accomplishments. Use strong action verbs and quantified metrics.
- For Summary, write a new 2-3 sentence summary tailored to the target role.
- Omit sections that have no relevant content for this role.
- Preserve factual accuracy — do not invent experience, companies, degrees, or certifications.
- Each section must have a unique "id" field (UUID format).

Output schema:
{
  "title": "<Name — Target Role>",
  "target_role": "<the target role>",
  "sections": [
    {"id": "<uuid>", "title": "Header", "type": "entries", "content": "", "items": [],
     "entries": [{"full_name": "", "title": "<tailored professional title>", "location": "", "phone": "", "email": "", "linkedin_url": "", "github_url": "", "portfolio_url": ""}],
     "visible": true, "order": 0},
    {"id": "<uuid>", "title": "Summary", "type": "text", "content": "<2-3 sentence tailored summary>",
     "items": [], "entries": [], "visible": true, "order": 1},
    {"id": "<uuid>", "title": "Skills", "type": "entries", "content": "", "items": [],
     "entries": [{"category": "", "skills": ""}], "visible": true, "order": 2},
    {"id": "<uuid>", "title": "Experience", "type": "entries", "content": "", "items": [],
     "entries": [{"company": "", "role": "", "start_date": "", "end_date": "", "description": ""}],
     "visible": true, "order": 3}
  ]
}

"""


async def _tailor_with_llm(
    master_sections_json: str, target_role: str, job_description: str
) -> dict:
    from config import settings

    if not settings.anthropic_api_key:
        raise TailorError("AI tailoring not configured. Set ANTHROPIC_API_KEY.")

    import anthropic

    prompt = _TAILOR_PROMPT
    prompt += f"\nTarget role: {target_role}\n"
    if job_description:
        prompt += f"\nJob description:\n{job_description}\n"
    prompt += f"\nUser's master career data:\n{master_sections_json}\n"

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise TailorError(f"AI returned invalid JSON: {exc}") from exc
