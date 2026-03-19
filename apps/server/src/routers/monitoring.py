"""Monitoring endpoints — read-only views of execution data."""

from fastapi import APIRouter, HTTPException, Query

from bson import ObjectId
from dependencies import DB, ManagerUser, Pagination, TenantId
from models.jobs import JobMatch, JobMatchUpdate, JobPosting
from models.runs import ApplicationAttempt, ApplicationRun, FetchRun

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


# All monitoring endpoints require at least manager role


# ── application runs ──


@router.get("/application-runs")
async def list_application_runs(
    db: DB,
    tenant_id: TenantId,
    page: Pagination,
    _manager: ManagerUser,
    status: str | None = Query(None),
) -> list[ApplicationRun]:
    query: dict = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    cursor = (
        db.application_runs.find(query)
        .sort("created_at", -1)
        .skip(page.skip)
        .limit(page.limit)
    )
    docs = await cursor.to_list(length=page.limit)
    return [ApplicationRun(**d) for d in docs]


@router.get("/application-runs/{run_id}")
async def get_application_run(
    run_id: str, db: DB, tenant_id: TenantId, _manager: ManagerUser
) -> ApplicationRun:
    doc = await db.application_runs.find_one(
        {"_id": ObjectId(run_id), "tenant_id": tenant_id}
    )
    if not doc:
        raise HTTPException(404, "Application run not found")
    return ApplicationRun(**doc)


@router.get("/application-runs/{run_id}/attempts")
async def list_attempts(
    run_id: str, db: DB, tenant_id: TenantId, _manager: ManagerUser
) -> list[ApplicationAttempt]:
    cursor = db.application_attempts.find(
        {"tenant_id": tenant_id, "application_run_id": run_id}
    ).sort("attempt_number", 1)
    docs = await cursor.to_list(length=50)
    return [ApplicationAttempt(**d) for d in docs]


# ── fetch runs ──


@router.get("/fetch-runs")
async def list_fetch_runs(
    db: DB,
    tenant_id: TenantId,
    page: Pagination,
    _manager: ManagerUser,
    status: str | None = Query(None),
) -> list[FetchRun]:
    query: dict = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    cursor = (
        db.fetch_runs.find(query)
        .sort("created_at", -1)
        .skip(page.skip)
        .limit(page.limit)
    )
    docs = await cursor.to_list(length=page.limit)
    return [FetchRun(**d) for d in docs]


# ── job postings ──


@router.get("/job-postings")
async def list_job_postings(
    db: DB,
    tenant_id: TenantId,
    page: Pagination,
    _manager: ManagerUser,
    company: str | None = Query(None),
) -> list[JobPosting]:
    query: dict = {"tenant_id": tenant_id}
    if company:
        query["company"] = {"$regex": company, "$options": "i"}
    cursor = (
        db.job_postings.find(query)
        .sort("created_at", -1)
        .skip(page.skip)
        .limit(page.limit)
    )
    docs = await cursor.to_list(length=page.limit)
    return [JobPosting(**d) for d in docs]


# ── job matches ──


@router.get("/job-matches")
async def list_job_matches(
    db: DB,
    tenant_id: TenantId,
    page: Pagination,
    _manager: ManagerUser,
    user_id: str | None = Query(None),
    status: str | None = Query(None),
) -> list[JobMatch]:
    query: dict = {"tenant_id": tenant_id}
    if user_id:
        query["user_id"] = user_id
    if status:
        query["status"] = status
    cursor = (
        db.job_matches.find(query)
        .sort("created_at", -1)
        .skip(page.skip)
        .limit(page.limit)
    )
    docs = await cursor.to_list(length=page.limit)
    return [JobMatch(**d) for d in docs]


@router.patch("/job-matches/{match_id}")
async def update_job_match(
    match_id: str, body: JobMatchUpdate, db: DB, tenant_id: TenantId, _manager: ManagerUser
) -> JobMatch:
    from datetime import datetime, timezone

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(422, "No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.job_matches.update_one(
        {"_id": ObjectId(match_id), "tenant_id": tenant_id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Match not found")
    doc = await db.job_matches.find_one(
        {"_id": ObjectId(match_id), "tenant_id": tenant_id}
    )
    return JobMatch(**doc)
