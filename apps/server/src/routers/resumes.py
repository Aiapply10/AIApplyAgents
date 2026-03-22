"""Resume builder endpoints — thin router delegating to ResumeService."""

from fastapi import APIRouter, File, HTTPException, UploadFile

from dependencies import DB, CurrentUser, Pagination, TenantId
from models.resumes import MarkdownImport, Resume, ResumeCreate, ResumeUpdate
from services.resume import ResumeService
from services.resume.analyzer import analyze

router = APIRouter(prefix="/resumes", tags=["resumes"])
_svc = ResumeService()

_EXTRACT_ERRORS = {
    "unsupported_type": (422, "Unsupported file type. Upload PDF or DOCX."),
    "file_too_large": (422, "File too large. Maximum 10 MB."),
    "insufficient_text": (422, "Could not extract enough text from the file."),
}


def _uid(user: dict) -> str:
    return user["supertokens_user_id"]


# ── CRUD ──


@router.get("")
async def list_resumes(db: DB, tenant_id: TenantId, user: CurrentUser, page: Pagination) -> list[Resume]:
    return await _svc.list(db, tenant_id, _uid(user), page.skip, page.limit)


@router.get("/{resume_id}")
async def get_resume(resume_id: str, db: DB, tenant_id: TenantId, user: CurrentUser) -> Resume:
    resume = await _svc.get(db, tenant_id, _uid(user), resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")
    return resume


@router.post("", status_code=201)
async def create_resume(body: ResumeCreate, db: DB, tenant_id: TenantId, user: CurrentUser) -> Resume:
    resume = await _svc.create(db, tenant_id, _uid(user), body)
    if not resume:
        raise HTTPException(500, "Failed to create resume")
    return resume


@router.patch("/{resume_id}")
async def update_resume(resume_id: str, body: ResumeUpdate, db: DB, tenant_id: TenantId, user: CurrentUser) -> Resume:
    resume = await _svc.update(db, tenant_id, _uid(user), resume_id, body)
    if not resume:
        raise HTTPException(404, "Resume not found")
    return resume


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(resume_id: str, db: DB, tenant_id: TenantId, user: CurrentUser) -> None:
    ok = await _svc.delete(db, tenant_id, _uid(user), resume_id)
    if not ok:
        raise HTTPException(404, "Resume not found")


# ── Special creation endpoints ──


@router.post("/from-profile", status_code=201)
async def create_from_profile(db: DB, tenant_id: TenantId, user: CurrentUser) -> Resume:
    resume = await _svc.create_from_profile(db, tenant_id, _uid(user))
    if not resume:
        raise HTTPException(404, "Profile not found — complete your profile first")
    return resume


@router.post("/from-markdown", status_code=201)
async def create_from_markdown(body: MarkdownImport, db: DB, tenant_id: TenantId, user: CurrentUser) -> Resume:
    resume = await _svc.create_from_markdown(db, tenant_id, _uid(user), body)
    if not resume:
        raise HTTPException(422, "Could not parse any sections from the markdown")
    return resume


@router.post("/extract", status_code=201)
async def extract_from_file(db: DB, tenant_id: TenantId, user: CurrentUser, file: UploadFile = File(...)) -> Resume:
    if not file.filename:
        raise HTTPException(422, "No file provided")
    file_bytes = await file.read()
    result = await _svc.extract_from_file(db, tenant_id, _uid(user), file.filename, file_bytes)
    if isinstance(result, str):
        if result in _EXTRACT_ERRORS:
            status, detail = _EXTRACT_ERRORS[result]
            raise HTTPException(status, detail)
        if result.startswith("extraction_failed:"):
            detail = result.split(":", 1)[1].strip()
            raise HTTPException(503 if "not configured" in detail else 422, detail)
        raise HTTPException(422, result)
    return result


# ── Analysis ──


@router.post("/{resume_id}/analyze")
async def analyze_resume(resume_id: str, body: dict, db: DB, tenant_id: TenantId, user: CurrentUser) -> dict:
    resume = await _svc.get(db, tenant_id, _uid(user), resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")
    return analyze(resume.model_dump(), body.get("target_role"), body.get("job_description"))
