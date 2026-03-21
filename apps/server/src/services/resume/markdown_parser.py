"""Markdown → structured ResumeSection parser.

Handles ## Heading + body blocks, title aliasing, and per-section-type parsers.
Also includes profile-to-sections builder.
"""

import re
import uuid
from typing import Any

from models.resumes import ResumeSection

_TITLE_ALIASES: dict[str, str] = {
    "header": "Header", "contact": "Header", "contact info": "Header",
    "summary": "Summary", "professional summary": "Summary", "about": "Summary",
    "skills": "Skills", "technical skills": "Skills",
    "experience": "Experience", "work experience": "Experience", "employment": "Experience",
    "projects": "Projects", "education": "Education",
    "certifications": "Certifications", "certs": "Certifications", "certificates": "Certifications",
    "achievements": "Achievements", "awards": "Achievements",
    "open source": "Open Source", "open-source": "Open Source",
    "leadership": "Leadership", "publications": "Publications",
    "additional": "Additional", "other": "Additional", "interests": "Additional",
}


def _strip_bold(text: str) -> str:
    return re.sub(r"\*\*(.+?)\*\*", r"\1", text).strip()


def _split_md_sections(md: str) -> list[tuple[str, str]]:
    parts = re.split(r"\n##\s+", "\n" + md)
    result = []
    for part in parts[1:]:
        lines = part.strip().split("\n", 1)
        title = lines[0].strip()
        body = lines[1].strip() if len(lines) > 1 else ""
        result.append((title, body))
    return result


# ── Per-section parsers ──


def _parse_header(body: str) -> dict[str, Any]:
    field_map = {
        "name": "full_name", "full name": "full_name", "title": "title",
        "professional title": "title", "location": "location", "phone": "phone",
        "email": "email", "linkedin": "linkedin_url", "github": "github_url",
        "portfolio": "portfolio_url", "blog": "blog_url", "website": "portfolio_url",
    }
    entry: dict[str, str] = {"_selected": "true"}
    for line in body.split("\n"):
        line = line.strip().lstrip("-*").strip()
        if not line:
            continue
        m = re.match(r"(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.+)", line)
        if m:
            field = field_map.get(m.group(1).strip().lower())
            if field:
                entry[field] = m.group(2).strip()
    return entry


def _parse_skills(body: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for line in body.split("\n"):
        line = line.strip().lstrip("-*").strip()
        if not line:
            continue
        m = re.match(r"(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.+)", line)
        if m:
            entries.append({"category": m.group(1).strip(), "skills": m.group(2).strip(), "_selected": True})
        elif line:
            entries.append({"category": "General", "skills": _strip_bold(line), "_selected": True})
    return entries


def _parse_experience(body: str) -> list[dict[str, Any]]:
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
            text = _strip_bold(stripped.lstrip("-*").strip())
            m = re.match(r"(.+?)\s+at\s+(.+?)\s*\(([^–—-]+?)\s*[–—-]\s*([^)]+)\)", text)
            if m:
                current = {"role": m.group(1).strip(), "company": m.group(2).strip(),
                           "start_date": m.group(3).strip(), "end_date": m.group(4).strip(),
                           "description": "", "_selected": True}
            else:
                current = {"role": text, "company": "", "start_date": "", "end_date": "",
                           "description": "", "_selected": True}
        elif re.match(r"^\s+[-*]\s+", line) and current is not None:
            bullet = re.sub(r"^\s+[-*]\s+", "", line).strip()
            if bullet:
                bullets.append(bullet)
        elif current is not None:
            bullets.append(stripped.lstrip("-*").strip())
    flush()
    return entries


def _parse_projects(body: str) -> list[dict[str, Any]]:
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
            text = _strip_bold(stripped.lstrip("-*").strip())
            if "|" in text:
                parts = text.split("|", 1)
                current = {"name": parts[0].strip(), "tech_stack": parts[1].strip(),
                           "description": "", "_selected": True}
            else:
                current = {"name": text, "tech_stack": "", "description": "", "_selected": True}
        elif re.match(r"^\s+[-*]\s+", line) and current is not None:
            bullet = re.sub(r"^\s+[-*]\s+", "", line).strip()
            if bullet:
                bullets.append(bullet)
        elif current is not None:
            bullets.append(stripped.lstrip("-*").strip())
    flush()
    return entries


def _parse_education(body: str) -> list[dict[str, Any]]:
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
            text = _strip_bold(stripped.lstrip("-*").strip())
            m = re.match(r"(.+?)\s*[—–-]+\s*(.+?)\s*\((\d{4})\)", text) or \
                re.match(r"(.+?)\s+from\s+(.+?)\s*\((\d{4})\)", text)
            if m:
                current = {"degree": m.group(1).strip(), "institution": m.group(2).strip(),
                           "year": m.group(3).strip(), "coursework": "", "_selected": True}
            else:
                current = {"degree": text, "institution": "", "year": "", "coursework": "", "_selected": True}
        elif current is not None:
            sub = re.sub(r"^\s+[-*]\s+", "", line).strip()
            cm = re.match(r"(?:relevant\s+)?coursework\s*:\s*(.+)", sub, re.I)
            if cm:
                current["coursework"] = cm.group(1).strip()
    flush()
    return entries


def _parse_certifications(body: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for line in body.split("\n"):
        stripped = line.strip().lstrip("-*").strip()
        if not stripped:
            continue
        text = _strip_bold(stripped)
        m = re.match(r"(.+?)\s*[—–-]+\s*(.+?)\s*\((\d{4})\)", text)
        if m:
            entries.append({"name": m.group(1).strip(), "issuer": m.group(2).strip(),
                            "year": m.group(3).strip(), "_selected": True})
        else:
            m2 = re.match(r"(.+?)\s*\((\d{4})\)", text)
            if m2:
                entries.append({"name": m2.group(1).strip(), "issuer": "",
                                "year": m2.group(2).strip(), "_selected": True})
            elif text:
                entries.append({"name": text, "issuer": "", "year": "", "_selected": True})
    return entries


def _parse_description_entries(body: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for line in body.split("\n"):
        stripped = line.strip().lstrip("-*").strip()
        if not stripped:
            continue
        entries.append({"description": _strip_bold(stripped), "_selected": True})
    return entries


def _parse_open_source(body: str) -> list[dict[str, Any]]:
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
            text = _strip_bold(stripped.lstrip("-*").strip())
            m = re.match(r"(.+?)\s*[—–-]+\s*(.+)", text)
            if m:
                current = {"repo_name": m.group(1).strip(), "contribution_type": m.group(2).strip(),
                           "impact": "", "_selected": True}
            else:
                current = {"repo_name": text, "contribution_type": "", "impact": "", "_selected": True}
        elif re.match(r"^\s+[-*]\s+", line) and current is not None:
            impact = re.sub(r"^\s+[-*]\s+", "", line).strip()
            if impact:
                current["impact"] = (current["impact"] + "; " + impact if current["impact"] else impact)
    flush()
    return entries


def _parse_publications(body: str) -> list[dict[str, Any]]:
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
            text = _strip_bold(stripped.lstrip("-*").strip())
            m = re.match(r"(.+?)\s*[—–-]+\s*(https?://\S+)", text)
            if m:
                current = {"title": m.group(1).strip(), "url": m.group(2).strip(),
                           "description": "", "_selected": True}
            else:
                current = {"title": text, "url": "", "description": "", "_selected": True}
        elif re.match(r"^\s+[-*]\s+", line) and current is not None:
            desc = re.sub(r"^\s+[-*]\s+", "", line).strip()
            if desc:
                current["description"] = (current["description"] + " " + desc if current["description"] else desc)
    flush()
    return entries


def _parse_additional(body: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for line in body.split("\n"):
        stripped = line.strip().lstrip("-*").strip()
        if not stripped:
            continue
        m = re.match(r"(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.+)", stripped)
        if m:
            entries.append({"category": m.group(1).strip(), "description": m.group(2).strip(), "_selected": True})
        elif stripped:
            entries.append({"category": "", "description": _strip_bold(stripped), "_selected": True})
    return entries


# ── Section → parser dispatch ──

_SECTION_PARSERS: dict[str, Any] = {
    "Header": lambda b: ("entries", _parse_header(b)),
    "Summary": lambda b: ("text", b),
    "Skills": lambda b: ("entries_list", _parse_skills(b)),
    "Experience": lambda b: ("entries_list", _parse_experience(b)),
    "Projects": lambda b: ("entries_list", _parse_projects(b)),
    "Education": lambda b: ("entries_list", _parse_education(b)),
    "Certifications": lambda b: ("entries_list", _parse_certifications(b)),
    "Achievements": lambda b: ("entries_list", _parse_description_entries(b)),
    "Open Source": lambda b: ("entries_list", _parse_open_source(b)),
    "Leadership": lambda b: ("entries_list", _parse_description_entries(b)),
    "Publications": lambda b: ("entries_list", _parse_publications(b)),
    "Additional": lambda b: ("entries_list", _parse_additional(b)),
}


# ── Public API ──


def parse_markdown_to_sections(md: str) -> list[ResumeSection]:
    """Parse ## Heading + content blocks into structured ResumeSection objects."""
    raw_sections = _split_md_sections(md)
    sections: list[ResumeSection] = []

    for i, (raw_title, body) in enumerate(raw_sections):
        title = _TITLE_ALIASES.get(raw_title.lower().strip(), raw_title.strip())
        parser = _SECTION_PARSERS.get(title)

        if parser:
            kind, parsed = parser(body)
            if kind == "entries":
                if any(v for k, v in parsed.items() if k != "_selected"):
                    sections.append(ResumeSection(id=str(uuid.uuid4()), title=title,
                                                  type="entries", entries=[parsed], visible=True, order=i))
            elif kind == "text":
                clean = re.sub(r"^\[.*?\]$", "", parsed, flags=re.MULTILINE).strip()
                if clean:
                    sections.append(ResumeSection(id=str(uuid.uuid4()), title=title,
                                                  type="text", content=clean, visible=True, order=i))
            elif kind == "entries_list" and parsed:
                sections.append(ResumeSection(id=str(uuid.uuid4()), title=title,
                                              type="entries", entries=parsed, visible=True, order=i))
        else:
            clean = re.sub(r"^\[.*?\]$", "", body, flags=re.MULTILINE).strip()
            if clean:
                sections.append(ResumeSection(id=str(uuid.uuid4()), title=title,
                                              type="text", content=clean, visible=True, order=i))
    return sections


def sections_from_profile(profile: dict) -> list[ResumeSection]:
    """Build default resume sections from a user profile document."""
    sections: list[ResumeSection] = []
    order = 0
    if profile.get("summary"):
        sections.append(ResumeSection(id=str(uuid.uuid4()), title="Summary", type="text",
                                      content=profile["summary"], order=order))
        order += 1
    if profile.get("experience"):
        sections.append(ResumeSection(id=str(uuid.uuid4()), title="Experience", type="entries",
                                      entries=profile["experience"], order=order))
        order += 1
    if profile.get("education"):
        sections.append(ResumeSection(id=str(uuid.uuid4()), title="Education", type="entries",
                                      entries=profile["education"], order=order))
        order += 1
    if profile.get("skills"):
        sections.append(ResumeSection(id=str(uuid.uuid4()), title="Skills", type="list",
                                      items=profile["skills"], order=order))
        order += 1
    if profile.get("certifications"):
        sections.append(ResumeSection(id=str(uuid.uuid4()), title="Certifications", type="entries",
                                      entries=profile["certifications"], order=order))
        order += 1
    links = [profile[k] for k in ("linkedin_url", "github_url", "portfolio_url") if profile.get(k)]
    if links:
        sections.append(ResumeSection(id=str(uuid.uuid4()), title="Links", type="list",
                                      items=links, order=order))
    return sections
