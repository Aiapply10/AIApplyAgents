"""AI-powered resume extraction — PDF/DOCX text extraction + LLM structuring."""

import io
import json
import re


class ExtractionError(Exception):
    """Raised when text extraction or LLM structuring fails."""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file using pdfplumber."""
    import pdfplumber

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
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
    {"title": "Header", "type": "entries", "content": "", "items": [],
     "entries": [{"full_name": "", "title": "", "location": "", "phone": "", "email": "", "linkedin_url": "", "github_url": "", "portfolio_url": ""}],
     "visible": true, "order": 0},
    {"title": "Summary", "type": "text", "content": "<professional summary>", "items": [], "entries": [], "visible": true, "order": 1},
    {"title": "Skills", "type": "entries", "content": "", "items": [],
     "entries": [{"category": "<category>", "skills": "<comma-separated>"}], "visible": true, "order": 2},
    {"title": "Experience", "type": "entries", "content": "", "items": [],
     "entries": [{"company": "", "role": "", "start_date": "", "end_date": "", "description": "<bullets joined with newlines>"}], "visible": true, "order": 3},
    {"title": "Projects", "type": "entries", "content": "", "items": [],
     "entries": [{"name": "", "tech_stack": "", "description": ""}], "visible": true, "order": 4},
    {"title": "Education", "type": "entries", "content": "", "items": [],
     "entries": [{"degree": "", "institution": "", "year": "", "coursework": ""}], "visible": true, "order": 5},
    {"title": "Certifications", "type": "entries", "content": "", "items": [],
     "entries": [{"name": "", "issuer": "", "year": ""}], "visible": true, "order": 6}
  ]
}

Rules:
- Include ONLY sections that have actual content in the resume.
- For Skills, group into logical categories (e.g. "Languages", "Frameworks", "Tools").
- For Experience, each entry is one job. Description is bullet points separated by newlines, each starting with "• ".
- For entries arrays, include one object per item found.
- Each section must have a unique UUID in an "id" field.
- Omit sections with no content.
- Preserve the original wording — do not rewrite or embellish.
- Extract URLs for LinkedIn, GitHub, Portfolio if present.

Resume text:
"""


async def extract_with_llm(text: str) -> dict:
    """Send resume text to Claude and get structured JSON back.

    Raises ExtractionError if the API key is missing or the LLM returns invalid JSON.
    """
    from config import settings

    if not settings.anthropic_api_key:
        raise ExtractionError("AI extraction not configured. Set ANTHROPIC_API_KEY.")

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": _EXTRACTION_PROMPT + text}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ExtractionError(f"AI returned invalid JSON: {exc}") from exc
