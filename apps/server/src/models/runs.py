"""Execution run models: FetchRun, WorkflowRun, TaskRun, ApplicationRun, ApplicationAttempt."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from models.base import PyObjectId, TenantDoc
from models.enums import (
    ApplicationStatus,
    FetchRunStatus,
    TaskStatus,
    WorkflowStatus,
)


class FetchRun(TenantDoc):
    source_id: PyObjectId
    status: FetchRunStatus = FetchRunStatus.pending
    jobs_found: int = 0
    jobs_new: int = 0
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None


class WorkflowRun(TenantDoc):
    user_id: PyObjectId
    name: str
    status: WorkflowStatus = WorkflowStatus.pending
    trigger: str = "manual"  # manual, scheduled, auto
    config: dict[str, Any] = {}
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None


class WorkflowRunCreate(BaseModel):
    user_id: PyObjectId
    name: str
    trigger: str = "manual"
    config: dict[str, Any] = {}


class WorkflowStatusUpdate(BaseModel):
    status: WorkflowStatus


class TaskRun(TenantDoc):
    workflow_run_id: PyObjectId
    task_type: str  # fetch, match, apply
    status: TaskStatus = TaskStatus.pending
    input_data: dict[str, Any] = {}
    output_data: dict[str, Any] = {}
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None
    retry_count: int = 0


class ApplicationRun(TenantDoc):
    user_id: PyObjectId
    match_id: PyObjectId
    posting_id: PyObjectId
    workflow_run_id: PyObjectId | None = None
    status: ApplicationStatus = ApplicationStatus.pending
    platform: str
    target_url: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None


class ApplicationAttempt(TenantDoc):
    application_run_id: PyObjectId
    attempt_number: int
    flow_id: str  # maps to jobs_applier FlowContext.flow_id
    status: ApplicationStatus = ApplicationStatus.pending
    active_subflow: str = ""
    last_step: str = ""
    errors: list[dict[str, Any]] = []
    started_at: datetime | None = None
    finished_at: datetime | None = None
