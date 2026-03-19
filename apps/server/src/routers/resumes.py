"""Resume builder endpoints."""

import io
import json
import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File

from dependencies import CurrentUser, DB, Pagination, TenantId
from models.resumes import (
    MarkdownImport,
    Resume,
    ResumeCreate,
    ResumeSection,
    ResumeUpdate,
)
from repositories import resumes as repo

router = APIRouter(prefix="/resumes", tags=["resumes"])


# ── Markdown → sections parser ──

# Map common heading variations to canonical section titles
_TITLE_ALIASES: dict[str, str] = {
    "header": "Header",
    "contact": "Header",
    "contact info": "Header",
    "summary": "Summary",
    "professional summary": "Summary",
    "about": "Summary",
    "skills": "Skills",
    "technical skills": "Skills",
    "experience": "Experience",
    "work experience": "Experience",
    "employment": "Experience",
    "projects": "Projects",
    "education": "Education",
    "certifications": "Certifications",
    "certs": "Certifications",
    "certificates": "Certifications",
    "achievements": "Achievements",
    "awards": "Achievements",
    "open source": "Open Source",
    "open-source": "Open Source",
    "leadership": "Leadership",
    "publications": "Publications",
    "additional": "Additional",
    "other": "Additional",
    "interests": "Additional",
}


def _strip_bold(text: str) -> str:
    """Remove markdown bold markers."""
    return re.sub(r"\*\*(.+?)\*\*", r"\1", text).strip()


def _split_md_sections(md: str) -> list[tuple[str, str]]:
    """Split markdown into (title, body) pairs by ## headings."""
    parts = re.split(r"\n##\s+", "\n" + md)
    result = []
    for part in parts[1:]:
        lines = part.strip().split("\n", 1)
        title = lines[0].strip()
        body = lines[1].strip() if len(lines) > 1 else ""
        result.append((title, body))
    return result


def _parse_header(body: str) -> dict[str, Any]:
    """Parse key: value lines like '- **Name:** John Doe'."""
    field_map = {
        "name": "full_name",
        "full name": "full_name",
        "title": "title",
        "professional title": "title",
        "location": "location",
        "phone": "phone",
        "email": "email",
        "linkedin": "linkedin_url",
        "github": "github_url",
        "portfolio": "portfolio_url",
        "blog": "blog_url",
        "website": "portfolio_url",
    }
    entry: dict[str, str] = {"_selected": "true"}
    for line in body.split("\n"):
        line = line.strip().lstrip("-*").strip()
        if not line:
            continue
        # Match **Key:** Value or Key: Value
        m = re.match(r"(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.+)", line)
        if m:
            key_raw = m.group(1).strip().lower()
            val = m.group(2).strip()
            field = field_map.get(key_raw)
            if field:
                entry[field] = val
    return entry


def _parse_skills(body: str) -> list[dict[str, Any]]:
    """Parse '- **Category:** skill1, skill2' lines."""
    entries: list[dict[str, Any]] = []
    for line in body.split("\n"):
        line = line.strip().lstrip("-*").strip()
        if not line:
            continue
        m = re.match(r"(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.+)", line)
        if m:
            entries.append({
                "category": m.group(1).strip(),
                "skills": m.group(2).strip(),
                "_selected": True,
            })
        elif line:
            # Flat skill list — group under "General"
            entries.append({
                "category": "General",
                "skills": _strip_bold(line),
                "_selected": True,
            })
    return entries


def _parse_experience(body: str) -> list[dict[str, Any]]:
    """Parse experience entries:
    - **Role** at **Company** (Start – End)
      - Achievement bullet
    """
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    bullets: list[str] = []

    def flush():
        nonlocal current, bullets
        if current:
            if bullets:
                current["description"] = "\n".join(bullets)
            entries.append(current)
        current = None
        bullets = []

    for line in body.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        # Top-level bullet: new entry
        if re.match(r"^[-*]\s+\*\*", stripped):
            flush()
            text = stripped.lstrip("-*").strip()
            text = _strip_bold(text)
            # Try: Role at Company (dates)
            m = re.match(
                r"(.+?)\s+at\s+(.+?)\s*\(([^–—-]+?)\s*[–—-]\s*([^)]+)\)",
                text,
            )
            if m:
                current = {
                    "role": m.group(1).strip(),
                    "company": m.group(2).strip(),
                    "start_date": m.group(3).strip(),
                    "end_date": m.group(4).strip(),
                    "description": "",
                    "_selected": True,
                }
            else:
                # Fallback: just put the whole line as role
                current = {
                    "role": text,
                    "company": "",
                    "start_date": "",
                    "end_date": "",
                    "description": "",
                    "_selected": True,
                }
        elif re.match(r"^\s+[-*]\s+", line) and current is not None:
            # Sub-bullet (indented) → achievement
            bullet = re.sub(r"^\s+[-*]\s+", "", line).strip()
            if bullet:
                bullets.append(bullet)
        elif current is not None:
            # Continuation line
            bullets.append(stripped.lstrip("-*").strip())

    flush()
    return entries


def _parse_projects(body: str) -> list[dict[str, Any]]:
    """Parse: - **Name** | Tech Stack  \\n  - description"""
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    bullets: list[str] = []

    def flush():
        nonlocal current, bullets
        if current:
            if bullets:
                current["description"] = "\n".join(bullets)
            entries.append(current)
        current = None
        bullets = []

    for line in body.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r"^[-*]\s+\*\*", stripped):
            flush()
            text = stripped.lstrip("-*").strip()
            text = _strip_bold(text)
            # Name | Tech Stack or Name: description
            if "|" in text:
                parts = text.split("|", 1)
                current = {
                    "name": parts[0].strip(),
                    "tech_stack": parts[1].strip(),
                    "description": "",
                    "_selected": True,
                }
            else:
                current = {
                    "name": text,
                    "tech_stack": "",
                    "description": "",
                    "_selected": True,
                }
        elif re.match(r"^\s+[-*]\s+", line) and current is not None:
            bullet = re.sub(r"^\s+[-*]\s+", "", line).strip()
            if bullet:
                bullets.append(bullet)
        elif current is not None:
            bullets.append(stripped.lstrip("-*").strip())

    flush()
    return entries


def _parse_education(body: str) -> list[dict[str, Any]]:
    """Parse: - **Degree** — Institution (Year)  \\n  - Coursework: ..."""
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    def flush():
        nonlocal current
        if current:
            entries.append(current)
        current = None

    for line in body.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r"^[-*]\s+\*\*", stripped):
            flush()
            text = stripped.lstrip("-*").strip()
            text = _strip_bold(text)
            # Degree — Institution (Year) or Degree from Institution (Year)
            m = re.match(
                r"(.+?)\s*[—–-]+\s*(.+?)\s*\((\d{4})\)",
                text,
            ) or re.match(
                r"(.+?)\s+from\s+(.+?)\s*\((\d{4})\)",
                text,
            )
            if m:
                current = {
                    "degree": m.group(1).strip(),
                    "institution": m.group(2).strip(),
                    "year": m.group(3).strip(),
                    "coursework": "",
                    "_selected": True,
                }
            else:
                current = {
                    "degree": text,
                    "institution": "",
                    "year": "",
                    "coursework": "",
                    "_selected": True,
                }
        elif current is not None:
            # Check for coursework sub-bullet
            sub = re.sub(r"^\s+[-*]\s+", "", line).strip()
            cm = re.match(r"(?:relevant\s+)?coursework\s*:\s*(.+)", sub, re.I)
            if cm:
                current["coursework"] = cm.group(1).strip()

    flush()
    return entries


def _parse_certifications(body: str) -> list[dict[str, Any]]:
    """Parse: - **Name** — Issuer (Year)"""
    entries: list[dict[str, Any]] = []
    for line in body.split("\n"):
        stripped = line.strip().lstrip("-*").strip()
        if not stripped:
            continue
        text = _strip_bold(stripped)
        # Name — Issuer (Year)
        m = re.match(r"(.+?)\s*[—–-]+\s*(.+?)\s*\((\d{4})\)", text)
        if m:
            entries.append({
                "name": m.group(1).strip(),
                "issuer": m.group(2).strip(),
                "year": m.group(3).strip(),
                "_selected": True,
            })
        else:
            # Name (Year)
            m2 = re.match(r"(.+?)\s*\((\d{4})\)", text)
            if m2:
                entries.append({
                    "name": m2.group(1).strip(),
                    "issuer": "",
                    "year": m2.group(2).strip(),
                    "_selected": True,
                })
            elif text:
                entries.append({
                    "name": text,
                    "issuer": "",
                    "year": "",
                    "_selected": True,
                })
    return entries


def _parse_description_entries(body: str) -> list[dict[str, Any]]:
    """Parse simple bullet entries into {description} entries (Achievements, Leadership)."""
    entries: list[dict[str, Any]] = []
    for line in body.split("\n"):
        stripped = line.strip().lstrip("-*").strip()
        if not stripped:
            continue
        entries.append({
            "description": _strip_bold(stripped),
            "_selected": True,
        })
    return entries


def _parse_open_source(body: str) -> list[dict[str, Any]]:
    """Parse: - **owner/repo** — Contribution Type  \\n  - Impact"""
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    def flush():
        nonlocal current
        if current:
            entries.append(current)
        current = None

    for line in body.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r"^[-*]\s+\*\*", stripped):
            flush()
            text = stripped.lstrip("-*").strip()
            text = _strip_bold(text)
            m = re.match(r"(.+?)\s*[—–-]+\s*(.+)", text)
            if m:
                current = {
                    "repo_name": m.group(1).strip(),
                    "contribution_type": m.group(2).strip(),
                    "impact": "",
                    "_selected": True,
                }
            else:
                current = {
                    "repo_name": text,
                    "contribution_type": "",
                    "impact": "",
                    "_selected": True,
                }
        elif re.match(r"^\s+[-*]\s+", line) and current is not None:
            impact = re.sub(r"^\s+[-*]\s+", "", line).strip()
            if impact:
                current["impact"] = (
                    current["impact"] + "; " + impact if current["impact"] else impact
                )

    flush()
    return entries


def _parse_publications(body: str) -> list[dict[str, Any]]:
    """Parse: - **Title** — URL  \\n  - Description"""
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    def flush():
        nonlocal current
        if current:
            entries.append(current)
        current = None

    for line in body.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r"^[-*]\s+\*\*", stripped):
            flush()
            text = stripped.lstrip("-*").strip()
            text = _strip_bold(text)
            m = re.match(r"(.+?)\s*[—–-]+\s*(https?://\S+)", text)
            if m:
                current = {
                    "title": m.group(1).strip(),
                    "url": m.group(2).strip(),
                    "description": "",
                    "_selected": True,
                }
            else:
                current = {
                    "title": text,
                    "url": "",
                    "description": "",
                    "_selected": True,
                }
        elif re.match(r"^\s+[-*]\s+", line) and current is not None:
            desc = re.sub(r"^\s+[-*]\s+", "", line).strip()
            if desc:
                current["description"] = (
                    current["description"] + " " + desc
                    if current["description"]
                    else desc
                )

    flush()
    return entries


def _parse_additional(body: str) -> list[dict[str, Any]]:
    """Parse: - **Category:** description"""
    entries: list[dict[str, Any]] = []
    for line in body.split("\n"):
        stripped = line.strip().lstrip("-*").strip()
        if not stripped:
            continue
        m = re.match(r"(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.+)", stripped)
        if m:
            entries.append({
                "category": m.group(1).strip(),
                "description": m.group(2).strip(),
                "_selected": True,
            })
        elif stripped:
            entries.append({
                "category": "",
                "description": _strip_bold(stripped),
                "_selected": True,
            })
    return entries


def _parse_markdown_to_sections(md: str) -> list[ResumeSection]:
    """Parse ## Heading + content blocks into structured ResumeSection objects."""
    raw_sections = _split_md_sections(md)
    sections: list[ResumeSection] = []

    for i, (raw_title, body) in enumerate(raw_sections):
        # Normalize title
        title = _TITLE_ALIASES.get(raw_title.lower().strip(), raw_title.strip())

        if title == "Header":
            entry = _parse_header(body)
            if any(v for k, v in entry.items() if k != "_selected"):
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=[entry],
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Summary":
            # Strip placeholder brackets
            clean = re.sub(r"^\[.*?\]$", "", body, flags=re.MULTILINE).strip()
            if clean:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="text",
                        content=clean,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Skills":
            entries = _parse_skills(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Experience":
            entries = _parse_experience(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Projects":
            entries = _parse_projects(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Education":
            entries = _parse_education(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Certifications":
            entries = _parse_certifications(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Achievements":
            entries = _parse_description_entries(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Open Source":
            entries = _parse_open_source(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Leadership":
            entries = _parse_description_entries(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Publications":
            entries = _parse_publications(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        elif title == "Additional":
            entries = _parse_additional(body)
            if entries:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="entries",
                        entries=entries,
                        visible=True,
                        order=i,
                    )
                )

        else:
            # Unknown section — store as text
            clean = re.sub(r"^\[.*?\]$", "", body, flags=re.MULTILINE).strip()
            if clean:
                sections.append(
                    ResumeSection(
                        id=str(uuid.uuid4()),
                        title=title,
                        type="text",
                        content=clean,
                        visible=True,
                        order=i,
                    )
                )

    return sections


# ── Profile → sections builder ──


def _sections_from_profile(profile: dict) -> list[ResumeSection]:
    """Build default resume sections from a user profile document."""
    sections: list[ResumeSection] = []
    order = 0

    if profile.get("summary"):
        sections.append(
            ResumeSection(
                id=str(uuid.uuid4()),
                title="Summary",
                type="text",
                content=profile["summary"],
                order=order,
            )
        )
        order += 1

    if profile.get("experience"):
        sections.append(
            ResumeSection(
                id=str(uuid.uuid4()),
                title="Experience",
                type="entries",
                entries=profile["experience"],
                order=order,
            )
        )
        order += 1

    if profile.get("education"):
        sections.append(
            ResumeSection(
                id=str(uuid.uuid4()),
                title="Education",
                type="entries",
                entries=profile["education"],
                order=order,
            )
        )
        order += 1

    if profile.get("skills"):
        sections.append(
            ResumeSection(
                id=str(uuid.uuid4()),
                title="Skills",
                type="list",
                items=profile["skills"],
                order=order,
            )
        )
        order += 1

    if profile.get("certifications"):
        sections.append(
            ResumeSection(
                id=str(uuid.uuid4()),
                title="Certifications",
                type="entries",
                entries=profile["certifications"],
                order=order,
            )
        )
        order += 1

    # Links as a list
    links = []
    for key in ("linkedin_url", "github_url", "portfolio_url"):
        if profile.get(key):
            links.append(profile[key])
    if links:
        sections.append(
            ResumeSection(
                id=str(uuid.uuid4()),
                title="Links",
                type="list",
                items=links,
                order=order,
            )
        )

    return sections


# ── CRUD endpoints ──


@router.post("", status_code=201)
async def create_resume(
    body: ResumeCreate, db: DB, tenant_id: TenantId, user: CurrentUser
) -> Resume:
    data = body.model_dump()
    data["tenant_id"] = tenant_id
    data["user_id"] = user["supertokens_user_id"]
    # Serialize sections
    data["sections"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in body.sections]
    rid = await repo.create_resume(db, data)
    doc = await repo.get_resume(db, tenant_id, rid)
    return Resume(**doc)


@router.get("")
async def list_resumes(
    db: DB, tenant_id: TenantId, user: CurrentUser, page: Pagination
) -> list[Resume]:
    docs = await repo.list_resumes(
        db, tenant_id, user["supertokens_user_id"], page.skip, page.limit
    )
    return [Resume(**d) for d in docs]


@router.get("/{resume_id}")
async def get_resume(
    resume_id: str, db: DB, tenant_id: TenantId
) -> Resume:
    doc = await repo.get_resume(db, tenant_id, resume_id)
    if not doc:
        raise HTTPException(404, "Resume not found")
    return Resume(**doc)


@router.patch("/{resume_id}")
async def update_resume(
    resume_id: str, body: ResumeUpdate, db: DB, tenant_id: TenantId
) -> Resume:
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(422, "No fields to update")
    # Serialize sections if present
    if "sections" in updates and updates["sections"] is not None:
        updates["sections"] = [
            s.model_dump() if hasattr(s, "model_dump") else s
            for s in updates["sections"]
        ]
    ok = await repo.update_resume(db, tenant_id, resume_id, updates)
    if not ok:
        raise HTTPException(404, "Resume not found")
    doc = await repo.get_resume(db, tenant_id, resume_id)
    return Resume(**doc)


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: str, db: DB, tenant_id: TenantId
) -> None:
    ok = await repo.delete_resume(db, tenant_id, resume_id)
    if not ok:
        raise HTTPException(404, "Resume not found")


# ── Special creation endpoints ──


@router.post("/from-profile", status_code=201)
async def create_from_profile(
    db: DB, tenant_id: TenantId, user: CurrentUser
) -> Resume:
    """Create a resume pre-populated from the user's profile."""
    uid = user["supertokens_user_id"]
    profile = await db.user_profiles.find_one(
        {"tenant_id": tenant_id, "user_id": uid}
    )
    if not profile:
        raise HTTPException(404, "Profile not found — complete your profile first")

    name = profile.get("full_name", "My Resume")
    sections = _sections_from_profile(profile)

    data: dict[str, Any] = {
        "tenant_id": tenant_id,
        "user_id": uid,
        "title": f"{name}'s Resume",
        "target_role": "",
        "sections": [s.model_dump() for s in sections],
        "is_default": False,
    }
    rid = await repo.create_resume(db, data)
    doc = await repo.get_resume(db, tenant_id, rid)
    return Resume(**doc)


_STRONG_VERBS = {
    "built", "designed", "scaled", "optimized", "architected", "led",
    "implemented", "developed", "launched", "reduced", "increased",
    "delivered", "migrated", "automated", "created", "engineered",
    "drove", "improved", "achieved", "spearheaded", "established",
    "streamlined", "mentored", "refactored", "deployed", "integrated",
}
_WEAK_VERBS = {
    "worked", "helped", "assisted", "participated", "contributed",
    "was responsible", "involved", "supported", "handled", "managed",
}

_ROLE_KEYWORDS: dict[str, list[str]] = {
    "frontend": ["react", "javascript", "typescript", "css", "html", "vue", "angular", "webpack", "responsive", "ui/ux"],
    "backend": ["api", "database", "sql", "python", "java", "node", "microservices", "rest", "docker", "kubernetes"],
    "fullstack": ["react", "node", "api", "database", "typescript", "docker", "ci/cd", "aws", "rest", "testing"],
    "full stack": ["react", "node", "api", "database", "typescript", "docker", "ci/cd", "aws", "rest", "testing"],
    "data": ["python", "sql", "machine learning", "pandas", "statistics", "visualization", "tensorflow", "pytorch", "etl", "data pipeline"],
    "devops": ["docker", "kubernetes", "ci/cd", "aws", "terraform", "linux", "monitoring", "ansible", "jenkins", "infrastructure"],
    "sre": ["docker", "kubernetes", "monitoring", "incident", "linux", "terraform", "observability", "automation", "reliability", "on-call"],
    "mobile": ["react native", "swift", "kotlin", "ios", "android", "flutter", "mobile", "app store", "ui/ux", "api"],
    "design": ["figma", "ui/ux", "user research", "wireframe", "prototype", "accessibility", "design system", "typography", "color theory", "responsive"],
    "product": ["roadmap", "stakeholder", "agile", "user story", "metrics", "a/b testing", "prioritization", "okr", "market research", "analytics"],
    "engineer": ["python", "java", "algorithms", "data structures", "system design", "testing", "git", "agile", "ci/cd", "code review"],
    "ml": ["python", "machine learning", "deep learning", "tensorflow", "pytorch", "nlp", "computer vision", "model", "training", "evaluation"],
    "ai": ["python", "machine learning", "deep learning", "llm", "nlp", "transformer", "fine-tuning", "embeddings", "rag", "evaluation"],
}


def _extract_all_text(sections: list) -> str:
    """Concatenate all visible text from sections for full-text analysis."""
    parts: list[str] = []
    for sec in sections:
        if not sec.visible:
            continue
        if sec.content:
            parts.append(sec.content)
        for entry in sec.entries:
            for v in entry.values():
                if isinstance(v, str):
                    parts.append(v)
        for item in sec.items:
            parts.append(item)
    return " ".join(parts)


@router.post("/{resume_id}/analyze")
async def analyze_resume(
    resume_id: str,
    body: dict,
    db: DB,
    tenant_id: TenantId,
) -> dict:
    """Weighted resume scoring (0-100%) against a target role / JD."""
    import re as _re
    from models.resumes import ResumeSection as RS

    doc = await repo.get_resume(db, tenant_id, resume_id)
    if not doc:
        raise HTTPException(404, "Resume not found")

    target_role = (body.get("target_role") or doc.get("target_role") or "").strip()
    job_description = (body.get("job_description") or "").strip()
    sections = [RS(**s) if isinstance(s, dict) else s for s in doc.get("sections", [])]
    all_text = _extract_all_text(sections)
    all_text_lower = all_text.lower()

    # ── 0. JD / Role parsing ──
    jd_core_skills: list[str] = []
    jd_secondary_skills: list[str] = []
    jd_keywords: list[str] = []
    matched_role_type = ""
    if target_role:
        role_lower = target_role.lower()
        for rtype, kws in _ROLE_KEYWORDS.items():
            if rtype in role_lower:
                matched_role_type = rtype
                jd_core_skills = kws[:6]
                jd_secondary_skills = kws[6:]
                jd_keywords = kws
                break
        if not matched_role_type:
            jd_keywords = [w for w in role_lower.split() if len(w) > 3]

    # ── Extract structured data ──
    has = {"header": False, "summary": False, "experience": False, "education": False,
           "skills": False, "projects": False, "certifications": False,
           "open source": False, "leadership": False, "publications": False}
    all_skills: list[str] = []
    experience_entries: list[dict] = []
    project_entries: list[dict] = []
    total_bullets = 0
    quantified_bullets = 0
    strong_verb_bullets = 0
    weak_verb_bullets = 0
    word_count = len(all_text.split())
    issues: list[dict] = []
    suggestions: list[dict] = []

    for sec in sections:
        if not sec.visible:
            continue
        tl = sec.title.lower()
        if tl in has:
            has[tl] = True

        if tl == "header":
            if sec.entries:
                e = sec.entries[0]
                if not e.get("full_name"):
                    issues.append({"severity": "high", "section": "Header", "message": "Missing name in header"})
                if not e.get("email"):
                    issues.append({"severity": "high", "section": "Header", "message": "Missing email — ATS requires contact info"})
                if not e.get("phone"):
                    issues.append({"severity": "medium", "section": "Header", "message": "Missing phone number"})
                if not e.get("linkedin_url"):
                    suggestions.append({"section": "Header", "message": "Adding a LinkedIn URL strengthens professional credibility"})

        elif tl == "summary":
            text = sec.content or ""
            wc = len(text.split())
            if wc < 20:
                issues.append({"severity": "medium", "section": "Summary", "message": "Summary is too short — aim for 30-60 words"})
            elif wc > 80:
                suggestions.append({"section": "Summary", "message": "Summary is lengthy — consider trimming to 60 words"})
            if target_role and target_role.lower() not in text.lower():
                suggestions.append({"section": "Summary", "message": f"Mention \"{target_role}\" in your summary for ATS keyword matching"})

        elif tl == "skills":
            for entry in sec.entries:
                skills_str = entry.get("skills", "")
                if isinstance(skills_str, str):
                    for s in skills_str.split(","):
                        s = s.strip()
                        if s:
                            all_skills.append(s.lower())
            if sec.items:
                all_skills.extend([s.lower() for s in sec.items])

        elif tl == "experience":
            experience_entries = list(sec.entries)
            for entry in sec.entries:
                desc = entry.get("description", "")
                if isinstance(desc, str):
                    bullets = [b.strip() for b in desc.split("\n") if b.strip()]
                    total_bullets += len(bullets)
                    for bullet in bullets:
                        bl = bullet.lower()
                        if _re.search(r"\d", bullet):
                            quantified_bullets += 1
                        first_word = bl.split()[0] if bl.split() else ""
                        if first_word in _STRONG_VERBS or any(v in bl[:30] for v in _STRONG_VERBS):
                            strong_verb_bullets += 1
                        elif first_word in _WEAK_VERBS or any(v in bl[:30] for v in _WEAK_VERBS):
                            weak_verb_bullets += 1
                    if not bullets:
                        issues.append({"severity": "high", "section": "Experience", "message": f"No bullet points for \"{entry.get('role', 'a role')}\" — add achievements"})
                if not entry.get("company"):
                    issues.append({"severity": "medium", "section": "Experience", "message": f"Missing company name for \"{entry.get('role', 'a role')}\""})
                if not entry.get("start_date") or not entry.get("end_date"):
                    issues.append({"severity": "medium", "section": "Experience", "message": f"Missing dates for \"{entry.get('role', 'a role')}\""})

        elif tl == "education":
            for entry in sec.entries:
                if not entry.get("degree"):
                    issues.append({"severity": "medium", "section": "Education", "message": "Missing degree information"})
                if not entry.get("institution"):
                    issues.append({"severity": "medium", "section": "Education", "message": "Missing institution name"})

        elif tl == "projects":
            project_entries = list(sec.entries)

    # ══════════════════════════════════════
    # CATEGORY 1: Impact & Achievements (25)
    # ══════════════════════════════════════
    if total_bullets > 0:
        quant_ratio = quantified_bullets / total_bullets
        impact_score = round(quant_ratio * 25)
        if strong_verb_bullets > weak_verb_bullets:
            impact_score = min(25, impact_score + 3)
    elif has["experience"]:
        impact_score = 5
    else:
        impact_score = 0

    impact_feedback: list[str] = []
    if total_bullets > 0 and quantified_bullets == 0:
        impact_feedback.append("None of your bullets contain quantified metrics — add numbers (%, revenue, users)")
        issues.append({"severity": "high", "section": "Impact", "message": "No quantified achievements found across all bullet points"})
    elif total_bullets > 0 and quantified_bullets / total_bullets < 0.4:
        impact_feedback.append(f"Only {quantified_bullets}/{total_bullets} bullets are quantified — aim for at least 50%")
        suggestions.append({"section": "Impact", "message": f"Quantify more achievements — currently {quantified_bullets}/{total_bullets} bullets have metrics"})
    if weak_verb_bullets > strong_verb_bullets:
        impact_feedback.append("Too many weak verbs (worked, helped) — use strong verbs (built, scaled, optimized)")
        suggestions.append({"section": "Impact", "message": "Replace weak action verbs (worked, helped, assisted) with strong ones (built, scaled, optimized)"})

    # ══════════════════════════════════════
    # CATEGORY 2: Skills Relevance (20)
    # ══════════════════════════════════════
    core_matched = [s for s in jd_core_skills if any(s in sk for sk in all_skills) or s in all_text_lower]
    secondary_matched = [s for s in jd_secondary_skills if any(s in sk for sk in all_skills) or s in all_text_lower]
    core_match_pct = len(core_matched) / len(jd_core_skills) if jd_core_skills else 1.0
    secondary_match_pct = len(secondary_matched) / len(jd_secondary_skills) if jd_secondary_skills else 1.0

    core_score = round(core_match_pct * 10)
    secondary_score = round(secondary_match_pct * 5)

    skills_used_in_exp = sum(1 for s in all_skills if s in all_text_lower.replace(", ", " ").split())
    if len(all_skills) > 0:
        depth_ratio = min(1.0, skills_used_in_exp / len(all_skills))
    else:
        depth_ratio = 0
    depth_score = round(depth_ratio * 5) if has["experience"] or has["projects"] else min(2, round(depth_ratio * 5))
    skills_score = core_score + secondary_score + depth_score

    missing_core = [s for s in jd_core_skills if s not in core_matched]
    missing_secondary = [s for s in jd_secondary_skills if s not in secondary_matched]
    all_missing = missing_core + missing_secondary

    if missing_core:
        issues.append({"severity": "high", "section": "Skills", "message": f"Missing core skills for this role: {', '.join(missing_core)}"})
    if missing_secondary:
        suggestions.append({"section": "Skills", "message": f"Consider adding: {', '.join(missing_secondary)}"})
    if not has["skills"]:
        issues.append({"severity": "high", "section": "Skills", "message": "Missing Skills section — ATS heavily relies on keyword matching"})
        skills_score = 0

    # ══════════════════════════════════════
    # CATEGORY 3: Experience Quality (15)
    # ══════════════════════════════════════
    exp_count = len(experience_entries)
    has_ownership_signals = any(
        any(kw in str(e.get("description", "")).lower() for kw in ("led", "owned", "architected", "designed", "end-to-end", "system"))
        for e in experience_entries
    )
    has_scale_signals = any(
        any(kw in str(e.get("description", "")).lower() for kw in ("users", "scale", "million", "distributed", "production", "high-traffic"))
        for e in experience_entries
    )
    avg_bullets_per_role = total_bullets / exp_count if exp_count > 0 else 0

    if not has["experience"]:
        experience_score = 0
        issues.append({"severity": "high", "section": "Experience", "message": "Missing Experience section — critical for scoring"})
    elif has_ownership_signals and has_scale_signals and avg_bullets_per_role >= 3:
        experience_score = 15
    elif has_ownership_signals or has_scale_signals:
        experience_score = 10
    elif avg_bullets_per_role >= 2:
        experience_score = 7
    else:
        experience_score = 4

    if has["experience"] and avg_bullets_per_role < 3:
        suggestions.append({"section": "Experience", "message": f"Average {avg_bullets_per_role:.1f} bullets per role — aim for 3-5 to show depth"})

    # ══════════════════════════════════════
    # CATEGORY 4: Structure & Readability (10)
    # ══════════════════════════════════════
    section_count = sum(1 for v in has.values() if v)
    has_bullets = total_bullets > 0
    has_consistent_dates = all(
        e.get("start_date") and e.get("end_date") for e in experience_entries
    ) if experience_entries else True

    structure_score = 0
    if has["header"]:
        structure_score += 2
    else:
        issues.append({"severity": "high", "section": "Structure", "message": "Missing Header — add name and contact info"})
    if section_count >= 4:
        structure_score += 2
    elif section_count >= 2:
        structure_score += 1
    if has_bullets:
        structure_score += 2
    else:
        issues.append({"severity": "medium", "section": "Structure", "message": "No bullet points found — use bullets for scanability"})
    if has_consistent_dates:
        structure_score += 2
    if word_count >= 200:
        structure_score += 1
    if has["summary"]:
        structure_score += 1
    else:
        suggestions.append({"section": "Structure", "message": "Add a professional Summary section"})
    structure_score = min(10, structure_score)

    # ══════════════════════════════════════
    # CATEGORY 5: ATS Optimization (10)
    # ══════════════════════════════════════
    kw_matched = [k for k in jd_keywords if k in all_text_lower]
    kw_match_pct = len(kw_matched) / len(jd_keywords) if jd_keywords else 1.0
    keyword_score = round(kw_match_pct * 6)

    standard_headings = {"header", "summary", "skills", "experience", "education", "projects", "certifications"}
    uses_standard = sum(1 for s in sections if s.visible and s.title.lower() in standard_headings)
    format_score = min(4, round((uses_standard / max(section_count, 1)) * 4))
    ats_score = keyword_score + format_score

    if jd_keywords and kw_match_pct < 0.5:
        issues.append({"severity": "medium", "section": "ATS", "message": f"Low keyword match ({len(kw_matched)}/{len(jd_keywords)}) — tailor your resume to the role"})

    # ══════════════════════════════════════
    # CATEGORY 6: Projects & Proof of Work (10)
    # ══════════════════════════════════════
    proj_count = len(project_entries)
    has_links = any(
        e.get("url") or e.get("tech_stack") or e.get("repo_name")
        for e in project_entries
    )
    if proj_count >= 3 and has_links:
        projects_score = 10
    elif proj_count >= 2:
        projects_score = 7
    elif proj_count >= 1:
        projects_score = 5
    elif has["projects"]:
        projects_score = 3
    else:
        projects_score = 0
        suggestions.append({"section": "Projects", "message": "Add a Projects section to showcase hands-on execution ability"})

    # ══════════════════════════════════════
    # CATEGORY 7: Career Narrative (5)
    # ══════════════════════════════════════
    has_clear_title = has["summary"] and target_role
    has_progression = exp_count >= 2
    narrative_score = 0
    if has_clear_title:
        narrative_score += 2
    if has_progression:
        narrative_score += 2
    if has["summary"]:
        narrative_score += 1
    narrative_score = min(5, narrative_score)

    # ══════════════════════════════════════
    # CATEGORY 8: Extras (5)
    # ══════════════════════════════════════
    extras_score = 0
    if has["certifications"]:
        extras_score += 2
    if has["open source"]:
        extras_score += 2
    if has["leadership"]:
        extras_score += 1
    if has["publications"]:
        extras_score += 1
    extras_score = min(5, extras_score)

    # ══════════════════════════════════════
    # TOTAL
    # ══════════════════════════════════════
    total = impact_score + skills_score + experience_score + structure_score + ats_score + projects_score + narrative_score + extras_score
    total = max(0, min(100, total))

    if total >= 90:
        grade = "A+"
    elif total >= 75:
        grade = "A"
    elif total >= 60:
        grade = "B"
    elif total >= 40:
        grade = "C"
    else:
        grade = "D"

    interpretation = (
        "Elite — Top 5%" if total >= 90
        else "Strong hire" if total >= 75
        else "Average — needs improvement" if total >= 60
        else "Weak — significant gaps" if total >= 40
        else "Major rewrite recommended"
    )

    return {
        "score": total,
        "grade": grade,
        "interpretation": interpretation,
        "target_role": target_role,
        "categories": [
            {"name": "Impact & Achievements", "score": impact_score, "max": 25,
             "detail": f"{quantified_bullets}/{total_bullets} quantified bullets, {strong_verb_bullets} strong verbs" if total_bullets else "No experience bullets found"},
            {"name": "Skills Relevance", "score": skills_score, "max": 20,
             "detail": f"{len(core_matched)}/{len(jd_core_skills)} core, {len(secondary_matched)}/{len(jd_secondary_skills)} secondary matched" if jd_core_skills else f"{len(all_skills)} skills listed"},
            {"name": "Experience Quality", "score": experience_score, "max": 15,
             "detail": f"{exp_count} roles, {avg_bullets_per_role:.1f} avg bullets/role" if exp_count else "No experience found"},
            {"name": "Structure & Readability", "score": structure_score, "max": 10,
             "detail": f"{section_count} sections, {word_count} words"},
            {"name": "ATS Optimization", "score": ats_score, "max": 10,
             "detail": f"{len(kw_matched)}/{len(jd_keywords)} keywords matched" if jd_keywords else "No target role keywords to match"},
            {"name": "Projects & Proof of Work", "score": projects_score, "max": 10,
             "detail": f"{proj_count} projects" + (" with links/tech" if has_links else "")},
            {"name": "Career Narrative", "score": narrative_score, "max": 5,
             "detail": ("Clear positioning" if narrative_score >= 4 else "Needs stronger narrative")},
            {"name": "Extras", "score": extras_score, "max": 5,
             "detail": ", ".join([k.title() for k in ("certifications", "open source", "leadership", "publications") if has.get(k)]) or "None found"},
        ],
        "summary": {
            "sections_found": section_count,
            "total_skills": len(all_skills),
            "experience_entries": exp_count,
            "bullet_points": total_bullets,
            "quantified_bullets": quantified_bullets,
            "strong_verbs": strong_verb_bullets,
            "weak_verbs": weak_verb_bullets,
            "word_count": word_count,
        },
        "issues": issues,
        "suggestions": suggestions,
        "missing_keywords": all_missing[:12],
    }


@router.post("/from-markdown", status_code=201)
async def create_from_markdown(
    body: MarkdownImport, db: DB, tenant_id: TenantId, user: CurrentUser
) -> Resume:
    """Parse markdown (from chatbot output) into a structured resume."""
    sections = _parse_markdown_to_sections(body.markdown)
    if not sections:
        raise HTTPException(422, "Could not parse any sections from the markdown")

    data: dict[str, Any] = {
        "tenant_id": tenant_id,
        "user_id": user["supertokens_user_id"],
        "title": body.title,
        "target_role": body.target_role,
        "sections": [s.model_dump() for s in sections],
        "is_default": False,
    }
    rid = await repo.create_resume(db, data)
    doc = await repo.get_resume(db, tenant_id, rid)
    return Resume(**doc)


# ── AI Resume Extractor ──


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file using pdfplumber."""
    import pdfplumber

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


def _extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file using python-docx."""
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


_EXTRACTION_PROMPT = """\
You are a resume information extractor. Given the raw text of a resume, extract \
all information into a structured JSON object that follows this exact schema.

Return ONLY valid JSON, no markdown fences, no explanation.

Schema:
{
  "title": "<A short title for this resume, e.g. 'John Doe — Senior Engineer'>",
  "target_role": "<The role this resume targets, inferred from content>",
  "sections": [
    {
      "title": "Header",
      "type": "entries",
      "content": "",
      "items": [],
      "entries": [{"full_name": "", "title": "", "location": "", "phone": "", "email": "", "linkedin_url": "", "github_url": "", "portfolio_url": ""}],
      "visible": true,
      "order": 0
    },
    {
      "title": "Summary",
      "type": "text",
      "content": "<professional summary paragraph>",
      "items": [],
      "entries": [],
      "visible": true,
      "order": 1
    },
    {
      "title": "Skills",
      "type": "entries",
      "content": "",
      "items": [],
      "entries": [{"category": "<category name>", "skills": "<comma-separated skills>"}],
      "visible": true,
      "order": 2
    },
    {
      "title": "Experience",
      "type": "entries",
      "content": "",
      "items": [],
      "entries": [{"company": "", "role": "", "start_date": "", "end_date": "", "description": "<bullet points joined with newlines>"}],
      "visible": true,
      "order": 3
    },
    {
      "title": "Projects",
      "type": "entries",
      "content": "",
      "items": [],
      "entries": [{"name": "", "tech_stack": "", "description": ""}],
      "visible": true,
      "order": 4
    },
    {
      "title": "Education",
      "type": "entries",
      "content": "",
      "items": [],
      "entries": [{"degree": "", "institution": "", "year": "", "coursework": ""}],
      "visible": true,
      "order": 5
    },
    {
      "title": "Certifications",
      "type": "entries",
      "content": "",
      "items": [],
      "entries": [{"name": "", "issuer": "", "year": ""}],
      "visible": true,
      "order": 6
    }
  ]
}

Rules:
- Include ONLY sections that have actual content in the resume.
- For Skills, group into logical categories (e.g. "Languages", "Frameworks", "Tools").
- For Experience, each entry is one job. The description should be bullet points separated by newlines, each starting with "• ".
- For entries arrays, include one object per item found (multiple jobs, multiple educations, etc).
- Each section must have a unique UUID in an "id" field.
- Omit sections with no content (e.g. if no certifications, don't include that section).
- Preserve the original wording as much as possible — do not rewrite or embellish.
- Extract URLs for LinkedIn, GitHub, Portfolio if present.

Resume text:
"""


async def _extract_with_llm(text: str) -> dict:
    """Send resume text to Claude and get structured JSON back."""
    from config import settings

    if not settings.anthropic_api_key:
        raise HTTPException(
            503,
            "AI extraction is not configured. Set the ANTHROPIC_API_KEY environment variable.",
        )

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": _EXTRACTION_PROMPT + text,
            }
        ],
    )

    raw = response.content[0].text.strip()
    # Strip markdown fences if LLM wraps them
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            422, f"AI returned invalid JSON: {exc}"
        ) from exc


@router.post("/extract", status_code=201)
async def extract_from_file(
    db: DB,
    tenant_id: TenantId,
    user: CurrentUser,
    file: UploadFile = File(...),
) -> Resume:
    """Upload a PDF or DOCX resume, extract info with AI, and create a structured resume."""
    if not file.filename:
        raise HTTPException(422, "No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pdf", "docx"):
        raise HTTPException(
            422, "Unsupported file type. Please upload a PDF or DOCX file."
        )

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(422, "File too large. Maximum size is 10 MB.")

    # Extract raw text
    if ext == "pdf":
        text = _extract_text_from_pdf(file_bytes)
    else:
        text = _extract_text_from_docx(file_bytes)

    if not text or len(text.strip()) < 50:
        raise HTTPException(
            422,
            "Could not extract enough text from the file. The file may be image-based or empty.",
        )

    # Send to LLM for structured extraction
    extracted = await _extract_with_llm(text)

    # Build sections with UUIDs
    sections: list[dict] = []
    for s in extracted.get("sections", []):
        s.setdefault("id", str(uuid.uuid4()))
        s.setdefault("visible", True)
        s.setdefault("content", "")
        s.setdefault("items", [])
        s.setdefault("entries", [])
        sections.append(s)

    user_id = user["supertokens_user_id"]

    data: dict[str, Any] = {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "title": extracted.get("title", file.filename.rsplit(".", 1)[0]),
        "target_role": extracted.get("target_role", ""),
        "sections": sections,
        "is_default": False,
    }

    rid = await repo.create_resume(db, data)

    # Backfill master sections if empty
    from repositories import master_sections as ms_repo

    existing = await ms_repo.get_master_sections(db, tenant_id, user_id)
    if not existing or not existing.get("sections"):
        await ms_repo.upsert_master_sections(db, tenant_id, user_id, sections)

    doc = await repo.get_resume(db, tenant_id, rid)
    return Resume(**doc)
