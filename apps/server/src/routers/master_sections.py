"""Master sections endpoints — career data repo and AI resume tailoring."""

from fastapi import APIRouter, HTTPException

from dependencies import CurrentUser, DB, TenantId
from models.master_sections import MasterSections, MasterSectionsUpdate, TailorRequest
from models.resumes import Resume
from repositories import resumes as resume_repo
from services.master_sections import MasterSectionsService

router = APIRouter(prefix="/master-sections", tags=["master-sections"])
_svc = MasterSectionsService()

_IMPORT_ERRORS = {
    "resume_not_found": (404, "Resume not found"),
    "no_sections": (422, "Resume has no sections to import"),
}


def _uid(user: dict) -> str:
    return user["supertokens_user_id"]


@router.get("")
async def get_master_sections(db: DB, tenant_id: TenantId, user: CurrentUser) -> MasterSections:
    user_id = _uid(user)
    doc = await _svc.get(db, tenant_id, user_id)
    if not doc:
        return MasterSections(tenant_id=tenant_id, user_id=user_id, sections=[])
    return doc


@router.put("")
async def upsert_master_sections(
    body: MasterSectionsUpdate, db: DB, tenant_id: TenantId, user: CurrentUser
) -> MasterSections:
    user_id = _uid(user)
    result = await _svc.upsert(db, tenant_id, user_id, body)
    if not result:
        raise HTTPException(500, "Failed to upsert master sections")
    return result


@router.post("/import/{resume_id}")
async def import_from_resume(
    resume_id: str, db: DB, tenant_id: TenantId, user: CurrentUser
) -> MasterSections:
    result = await _svc.import_from_resume(db, tenant_id, _uid(user), resume_id)
    if isinstance(result, str):
        status, detail = _IMPORT_ERRORS.get(result, (422, result))
        raise HTTPException(status, detail)
    return result


@router.post("/tailor", status_code=201)
async def tailor_resume(
    body: TailorRequest, db: DB, tenant_id: TenantId, user: CurrentUser
) -> Resume:
    user_id = _uid(user)
    result = await _svc.tailor_resume(db, tenant_id, user_id, body.target_role,
                                      body.job_description, body.title)
    if isinstance(result, str):
        if result == "no_master_sections":
            raise HTTPException(422, "No master sections found. Add career data to Master Profile first.")
        if result.startswith("tailor_failed:"):
            detail = result.split(":", 1)[1].strip()
            raise HTTPException(503 if "not configured" in detail else 422, detail)
        raise HTTPException(422, result)

    rid = await resume_repo.create_resume(db, result)
    resume = await resume_repo.get_resume(db, tenant_id, user_id, rid)
    if not resume:
        raise HTTPException(500, "Failed to create tailored resume")
    return resume
