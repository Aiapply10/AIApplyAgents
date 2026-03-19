"""Master sections endpoints — career data repo and AI resume tailoring."""

import json
import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from dependencies import CurrentUser, DB, TenantId
from models.master_sections import MasterSections, MasterSectionsUpdate, TailorRequest
from models.resumes import Resume, ResumeSection
from repositories import master_sections as repo
from repositories import resumes as resume_repo

router = APIRouter(prefix="/master-sections", tags=["master-sections"])


@router.get("")
async def get_master_sections(
    db: DB, tenant_id: TenantId, user: CurrentUser
) -> MasterSections:
    user_id = user["supertokens_user_id"]
    doc = await repo.get_master_sections(db, tenant_id, user_id)
    if not doc:
        # Return empty master sections
        return MasterSections(
            tenant_id=tenant_id,
            user_id=user_id,
            sections=[],
        )
    return MasterSections(**doc)


@router.put("")
async def upsert_master_sections(
    body: MasterSectionsUpdate, db: DB, tenant_id: TenantId, user: CurrentUser
) -> MasterSections:
    user_id = user["supertokens_user_id"]
    sections_data = [s.model_dump() for s in body.sections]
    await repo.upsert_master_sections(db, tenant_id, user_id, sections_data)
    doc = await repo.get_master_sections(db, tenant_id, user_id)
    return MasterSections(**doc)


# ── Import from existing resume ──


@router.post("/import/{resume_id}")
async def import_from_resume(
    resume_id: str, db: DB, tenant_id: TenantId, user: CurrentUser
) -> MasterSections:
    """Copy sections from an existing resume into master sections."""
    user_id = user["supertokens_user_id"]
    resume_doc = await resume_repo.get_resume(db, tenant_id, resume_id)
    if not resume_doc:
        raise HTTPException(404, "Resume not found")
    if resume_doc.get("user_id") != user_id:
        raise HTTPException(403, "Not your resume")

    imported = resume_doc.get("sections", [])
    if not imported:
        raise HTTPException(422, "Resume has no sections to import")

    # Merge: for each imported section, if master already has that section title
    # with content, keep master's version. Otherwise use the imported one.
    existing = await repo.get_master_sections(db, tenant_id, user_id)
    existing_sections: list[dict] = existing.get("sections", []) if existing else []

    existing_by_title: dict[str, dict] = {}
    for s in existing_sections:
        existing_by_title[s.get("title", "")] = s

    merged: list[dict] = []
    seen_titles: set[str] = set()

    for s in imported:
        title = s.get("title", "")
        seen_titles.add(title)
        old = existing_by_title.get(title)
        # Keep existing if it has content, otherwise use imported
        if old and _section_has_content(old):
            merged.append(old)
        else:
            merged.append(s)

    # Keep any existing sections not in the import
    for s in existing_sections:
        if s.get("title", "") not in seen_titles:
            merged.append(s)

    await repo.upsert_master_sections(db, tenant_id, user_id, merged)
    doc = await repo.get_master_sections(db, tenant_id, user_id)
    return MasterSections(**doc)


def _section_has_content(s: dict) -> bool:
    if s.get("content", "").strip():
        return True
    if s.get("items"):
        return True
    if s.get("entries"):
        return True
    return False


# ── AI Resume Tailoring ──

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
    {
      "id": "<uuid>",
      "title": "Header",
      "type": "entries",
      "content": "",
      "items": [],
      "entries": [{"full_name": "", "title": "<tailored professional title>", "location": "", "phone": "", "email": "", "linkedin_url": "", "github_url": "", "portfolio_url": ""}],
      "visible": true,
      "order": 0
    },
    {
      "id": "<uuid>",
      "title": "Summary",
      "type": "text",
      "content": "<2-3 sentence tailored summary>",
      "items": [],
      "entries": [],
      "visible": true,
      "order": 1
    },
    {
      "id": "<uuid>",
      "title": "Skills",
      "type": "entries",
      "content": "",
      "items": [],
      "entries": [{"category": "", "skills": ""}],
      "visible": true,
      "order": 2
    },
    {
      "id": "<uuid>",
      "title": "Experience",
      "type": "entries",
      "content": "",
      "items": [],
      "entries": [{"company": "", "role": "", "start_date": "", "end_date": "", "description": ""}],
      "visible": true,
      "order": 3
    }
  ]
}

"""


async def _tailor_with_llm(
    master_sections_json: str, target_role: str, job_description: str
) -> dict:
    """Send master sections + role to Claude for tailoring."""
    from config import settings

    if not settings.anthropic_api_key:
        raise HTTPException(
            503,
            "AI tailoring is not configured. Set the ANTHROPIC_API_KEY environment variable.",
        )

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
        raise HTTPException(422, f"AI returned invalid JSON: {exc}") from exc


@router.post("/tailor", status_code=201)
async def tailor_resume(
    body: TailorRequest, db: DB, tenant_id: TenantId, user: CurrentUser
) -> Resume:
    """Create a new resume tailored to a target role from the user's master sections."""
    user_id = user["supertokens_user_id"]

    # Fetch master sections
    doc = await repo.get_master_sections(db, tenant_id, user_id)
    if not doc or not doc.get("sections"):
        raise HTTPException(
            422,
            "No master sections found. Please add your career data to Master Profile first.",
        )

    # Serialize master sections for the LLM
    master_json = json.dumps(doc["sections"], default=str)

    # Call LLM for tailoring
    tailored = await _tailor_with_llm(master_json, body.target_role, body.job_description)

    # Build sections with UUIDs
    sections: list[dict] = []
    for s in tailored.get("sections", []):
        s.setdefault("id", str(uuid.uuid4()))
        s.setdefault("visible", True)
        s.setdefault("content", "")
        s.setdefault("items", [])
        s.setdefault("entries", [])
        sections.append(s)

    title = body.title or tailored.get("title", f"Resume — {body.target_role}")

    data: dict[str, Any] = {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "title": title,
        "target_role": body.target_role,
        "sections": sections,
        "is_default": False,
    }

    rid = await resume_repo.create_resume(db, data)
    resume_doc = await resume_repo.get_resume(db, tenant_id, rid)
    return Resume(**resume_doc)
