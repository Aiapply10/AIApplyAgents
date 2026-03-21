"""Resume analysis — weighted scoring engine (0-100%) against a target role / JD."""

import re
from typing import Any

from models.resumes import ResumeSection

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


def _extract_all_text(sections: list[ResumeSection]) -> str:
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


def analyze(doc: dict, target_role: str | None = None, job_description: str | None = None) -> dict[str, Any]:
    """Run the full weighted analysis on a resume document."""
    target_role = (target_role or doc.get("target_role") or "").strip()
    sections = [ResumeSection(**s) if isinstance(s, dict) else s for s in doc.get("sections", [])]
    all_text = _extract_all_text(sections)
    all_text_lower = all_text.lower()

    # JD / Role parsing
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

    # Extract structured data
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
                suggestions.append({"section": "Summary", "message": f'Mention "{target_role}" in your summary for ATS keyword matching'})

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
                        if re.search(r"\d", bullet):
                            quantified_bullets += 1
                        first_word = bl.split()[0] if bl.split() else ""
                        if first_word in _STRONG_VERBS or any(v in bl[:30] for v in _STRONG_VERBS):
                            strong_verb_bullets += 1
                        elif first_word in _WEAK_VERBS or any(v in bl[:30] for v in _WEAK_VERBS):
                            weak_verb_bullets += 1
                    if not bullets:
                        issues.append({"severity": "high", "section": "Experience",
                                       "message": f"No bullet points for \"{entry.get('role', 'a role')}\" — add achievements"})
                if not entry.get("company"):
                    issues.append({"severity": "medium", "section": "Experience",
                                   "message": f"Missing company name for \"{entry.get('role', 'a role')}\""})
                if not entry.get("start_date") or not entry.get("end_date"):
                    issues.append({"severity": "medium", "section": "Experience",
                                   "message": f"Missing dates for \"{entry.get('role', 'a role')}\""})

        elif tl == "education":
            for entry in sec.entries:
                if not entry.get("degree"):
                    issues.append({"severity": "medium", "section": "Education", "message": "Missing degree information"})
                if not entry.get("institution"):
                    issues.append({"severity": "medium", "section": "Education", "message": "Missing institution name"})

        elif tl == "projects":
            project_entries = list(sec.entries)

    # Category 1: Impact & Achievements (25)
    if total_bullets > 0:
        quant_ratio = quantified_bullets / total_bullets
        impact_score = round(quant_ratio * 25)
        if strong_verb_bullets > weak_verb_bullets:
            impact_score = min(25, impact_score + 3)
    elif has["experience"]:
        impact_score = 5
    else:
        impact_score = 0

    if total_bullets > 0 and quantified_bullets == 0:
        issues.append({"severity": "high", "section": "Impact", "message": "No quantified achievements found"})
    elif total_bullets > 0 and quantified_bullets / total_bullets < 0.4:
        suggestions.append({"section": "Impact", "message": f"Quantify more — {quantified_bullets}/{total_bullets} bullets have metrics"})
    if weak_verb_bullets > strong_verb_bullets:
        suggestions.append({"section": "Impact", "message": "Replace weak verbs (worked, helped) with strong ones (built, scaled)"})

    # Category 2: Skills Relevance (20)
    core_matched = [s for s in jd_core_skills if any(s in sk for sk in all_skills) or s in all_text_lower]
    secondary_matched = [s for s in jd_secondary_skills if any(s in sk for sk in all_skills) or s in all_text_lower]
    core_match_pct = len(core_matched) / len(jd_core_skills) if jd_core_skills else 1.0
    secondary_match_pct = len(secondary_matched) / len(jd_secondary_skills) if jd_secondary_skills else 1.0
    core_score = round(core_match_pct * 10)
    secondary_score = round(secondary_match_pct * 5)
    skills_used_in_exp = sum(1 for s in all_skills if s in all_text_lower.replace(", ", " ").split())
    depth_ratio = min(1.0, skills_used_in_exp / len(all_skills)) if all_skills else 0
    depth_score = round(depth_ratio * 5) if has["experience"] or has["projects"] else min(2, round(depth_ratio * 5))
    skills_score = core_score + secondary_score + depth_score
    missing_core = [s for s in jd_core_skills if s not in core_matched]
    missing_secondary = [s for s in jd_secondary_skills if s not in secondary_matched]
    all_missing = missing_core + missing_secondary
    if missing_core:
        issues.append({"severity": "high", "section": "Skills", "message": f"Missing core skills: {', '.join(missing_core)}"})
    if missing_secondary:
        suggestions.append({"section": "Skills", "message": f"Consider adding: {', '.join(missing_secondary)}"})
    if not has["skills"]:
        issues.append({"severity": "high", "section": "Skills", "message": "Missing Skills section"})
        skills_score = 0

    # Category 3: Experience Quality (15)
    exp_count = len(experience_entries)
    has_ownership = any(any(kw in str(e.get("description", "")).lower() for kw in ("led", "owned", "architected", "designed", "end-to-end")) for e in experience_entries)
    has_scale = any(any(kw in str(e.get("description", "")).lower() for kw in ("users", "scale", "million", "distributed", "production")) for e in experience_entries)
    avg_bullets = total_bullets / exp_count if exp_count > 0 else 0
    if not has["experience"]:
        experience_score = 0
        issues.append({"severity": "high", "section": "Experience", "message": "Missing Experience section"})
    elif has_ownership and has_scale and avg_bullets >= 3:
        experience_score = 15
    elif has_ownership or has_scale:
        experience_score = 10
    elif avg_bullets >= 2:
        experience_score = 7
    else:
        experience_score = 4
    if has["experience"] and avg_bullets < 3:
        suggestions.append({"section": "Experience", "message": f"Average {avg_bullets:.1f} bullets/role — aim for 3-5"})

    # Category 4: Structure & Readability (10)
    section_count = sum(1 for v in has.values() if v)
    has_consistent_dates = all(e.get("start_date") and e.get("end_date") for e in experience_entries) if experience_entries else True
    structure_score = 0
    if has["header"]:
        structure_score += 2
    else:
        issues.append({"severity": "high", "section": "Structure", "message": "Missing Header"})
    if section_count >= 4:
        structure_score += 2
    elif section_count >= 2:
        structure_score += 1
    if total_bullets > 0:
        structure_score += 2
    else:
        issues.append({"severity": "medium", "section": "Structure", "message": "No bullet points found"})
    if has_consistent_dates:
        structure_score += 2
    if word_count >= 200:
        structure_score += 1
    if has["summary"]:
        structure_score += 1
    else:
        suggestions.append({"section": "Structure", "message": "Add a professional Summary section"})
    structure_score = min(10, structure_score)

    # Category 5: ATS Optimization (10)
    kw_matched = [k for k in jd_keywords if k in all_text_lower]
    kw_match_pct = len(kw_matched) / len(jd_keywords) if jd_keywords else 1.0
    keyword_score = round(kw_match_pct * 6)
    standard_headings = {"header", "summary", "skills", "experience", "education", "projects", "certifications"}
    uses_standard = sum(1 for s in sections if s.visible and s.title.lower() in standard_headings)
    format_score = min(4, round((uses_standard / max(section_count, 1)) * 4))
    ats_score = keyword_score + format_score
    if jd_keywords and kw_match_pct < 0.5:
        issues.append({"severity": "medium", "section": "ATS", "message": f"Low keyword match ({len(kw_matched)}/{len(jd_keywords)})"})

    # Category 6: Projects & Proof of Work (10)
    proj_count = len(project_entries)
    has_links = any(e.get("url") or e.get("tech_stack") or e.get("repo_name") for e in project_entries)
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
        suggestions.append({"section": "Projects", "message": "Add a Projects section"})

    # Category 7: Career Narrative (5)
    narrative_score = 0
    if has["summary"] and target_role:
        narrative_score += 2
    if exp_count >= 2:
        narrative_score += 2
    if has["summary"]:
        narrative_score += 1
    narrative_score = min(5, narrative_score)

    # Category 8: Extras (5)
    extras_score = min(5, sum([
        2 if has["certifications"] else 0,
        2 if has["open source"] else 0,
        1 if has["leadership"] else 0,
        1 if has["publications"] else 0,
    ]))

    # Total
    total = max(0, min(100, impact_score + skills_score + experience_score + structure_score + ats_score + projects_score + narrative_score + extras_score))
    grade = "A+" if total >= 90 else "A" if total >= 75 else "B" if total >= 60 else "C" if total >= 40 else "D"
    interpretation = ("Elite — Top 5%" if total >= 90 else "Strong hire" if total >= 75
                      else "Average — needs improvement" if total >= 60 else "Weak — significant gaps" if total >= 40
                      else "Major rewrite recommended")

    return {
        "score": total, "grade": grade, "interpretation": interpretation, "target_role": target_role,
        "categories": [
            {"name": "Impact & Achievements", "score": impact_score, "max": 25,
             "detail": f"{quantified_bullets}/{total_bullets} quantified, {strong_verb_bullets} strong verbs" if total_bullets else "No bullets found"},
            {"name": "Skills Relevance", "score": skills_score, "max": 20,
             "detail": f"{len(core_matched)}/{len(jd_core_skills)} core matched" if jd_core_skills else f"{len(all_skills)} skills listed"},
            {"name": "Experience Quality", "score": experience_score, "max": 15,
             "detail": f"{exp_count} roles, {avg_bullets:.1f} avg bullets" if exp_count else "No experience"},
            {"name": "Structure & Readability", "score": structure_score, "max": 10,
             "detail": f"{section_count} sections, {word_count} words"},
            {"name": "ATS Optimization", "score": ats_score, "max": 10,
             "detail": f"{len(kw_matched)}/{len(jd_keywords)} keywords" if jd_keywords else "No target keywords"},
            {"name": "Projects & Proof of Work", "score": projects_score, "max": 10,
             "detail": f"{proj_count} projects" + (" with links" if has_links else "")},
            {"name": "Career Narrative", "score": narrative_score, "max": 5,
             "detail": "Clear positioning" if narrative_score >= 4 else "Needs stronger narrative"},
            {"name": "Extras", "score": extras_score, "max": 5,
             "detail": ", ".join([k.title() for k in ("certifications", "open source", "leadership", "publications") if has.get(k)]) or "None"},
        ],
        "summary": {
            "sections_found": section_count, "total_skills": len(all_skills),
            "experience_entries": exp_count, "bullet_points": total_bullets,
            "quantified_bullets": quantified_bullets, "strong_verbs": strong_verb_bullets,
            "weak_verbs": weak_verb_bullets, "word_count": word_count,
        },
        "issues": issues, "suggestions": suggestions, "missing_keywords": all_missing[:12],
    }
