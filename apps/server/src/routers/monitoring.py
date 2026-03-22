"""Monitoring endpoints — read-only views of execution data."""

from fastapi import APIRouter, HTTPException, Query

from dependencies import DB, ManagerUser, Pagination, TenantId
from models.jobs import JobMatch, JobMatchUpdate, JobPosting
from models.runs import ApplicationAttempt, ApplicationRun, FetchRun
from services.monitoring import MonitoringService

router = APIRouter(prefix="/monitoring", tags=["monitoring"])
_svc = MonitoringService()


@router.get("/application-runs")
async def list_application_runs(
    db: DB, tenant_id: TenantId, page: Pagination, _manager: ManagerUser,
    status: str | None = Query(None),
) -> list[ApplicationRun]:
    return await _svc.list_application_runs(db, tenant_id, page.skip, page.limit, status)


@router.get("/application-runs/{run_id}")
async def get_application_run(
    run_id: str, db: DB, tenant_id: TenantId, _manager: ManagerUser
) -> ApplicationRun:
    run = await _svc.get_application_run(db, tenant_id, run_id)
    if not run:
        raise HTTPException(404, "Application run not found")
    return run


@router.get("/application-runs/{run_id}/attempts")
async def list_attempts(
    run_id: str, db: DB, tenant_id: TenantId, _manager: ManagerUser
) -> list[ApplicationAttempt]:
    return await _svc.list_attempts(db, tenant_id, run_id)


@router.get("/fetch-runs")
async def list_fetch_runs(
    db: DB, tenant_id: TenantId, page: Pagination, _manager: ManagerUser,
    status: str | None = Query(None),
) -> list[FetchRun]:
    return await _svc.list_fetch_runs(db, tenant_id, page.skip, page.limit, status)


@router.get("/job-postings")
async def list_job_postings(
    db: DB, tenant_id: TenantId, page: Pagination, _manager: ManagerUser,
    company: str | None = Query(None),
) -> list[JobPosting]:
    return await _svc.list_job_postings(db, tenant_id, page.skip, page.limit, company)


@router.get("/job-matches")
async def list_job_matches(
    db: DB, tenant_id: TenantId, page: Pagination, _manager: ManagerUser,
    user_id: str | None = Query(None), status: str | None = Query(None),
) -> list[JobMatch]:
    return await _svc.list_job_matches(db, tenant_id, page.skip, page.limit, user_id, status)


@router.patch("/job-matches/{match_id}")
async def update_job_match(
    match_id: str, body: JobMatchUpdate, db: DB, tenant_id: TenantId, _manager: ManagerUser
) -> JobMatch:
    match = await _svc.update_job_match(db, tenant_id, match_id, body)
    if not match:
        raise HTTPException(404, "Match not found")
    return match
