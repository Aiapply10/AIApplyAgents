"""Workflow orchestration endpoints."""

from fastapi import APIRouter, HTTPException, Query

from dependencies import DB, Pagination, TenantId
from models.runs import TaskRun, WorkflowRun, WorkflowRunCreate, WorkflowStatusUpdate
from repositories import workflows as repo

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("", status_code=201)
async def create_workflow(
    body: WorkflowRunCreate, db: DB, tenant_id: TenantId
) -> WorkflowRun:
    data = body.model_dump()
    data["tenant_id"] = tenant_id
    wf_id = await repo.create_workflow(db, data)
    wf = await repo.get_workflow(db, tenant_id, wf_id)
    if not wf:
        raise HTTPException(500, "Failed to create workflow")
    return wf


@router.get("")
async def list_workflows(
    db: DB, tenant_id: TenantId, page: Pagination,
    status: str | None = Query(None),
) -> list[WorkflowRun]:
    return await repo.list_workflows(db, tenant_id, page.skip, page.limit, status)


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str, db: DB, tenant_id: TenantId) -> WorkflowRun:
    wf = await repo.get_workflow(db, tenant_id, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf


@router.patch("/{workflow_id}/status")
async def update_workflow_status(
    workflow_id: str, body: WorkflowStatusUpdate, db: DB, tenant_id: TenantId
) -> WorkflowRun:
    ok = await repo.update_workflow_status(db, tenant_id, workflow_id, body.status)
    if not ok:
        raise HTTPException(404, "Workflow not found")
    wf = await repo.get_workflow(db, tenant_id, workflow_id)
    return wf


@router.get("/{workflow_id}/tasks")
async def list_tasks(workflow_id: str, db: DB, tenant_id: TenantId) -> list[TaskRun]:
    return await repo.list_task_runs(db, tenant_id, workflow_id)


@router.get("/{workflow_id}/tasks/{task_id}")
async def get_task(workflow_id: str, task_id: str, db: DB, tenant_id: TenantId) -> TaskRun:
    task = await repo.get_task_run(db, tenant_id, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task
