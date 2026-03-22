"""Workflow repository — workflow_runs and task_runs collections."""

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.runs import TaskRun, WorkflowRun


# ── workflow_runs ──


async def create_workflow(db: AsyncIOMotorDatabase, data: dict) -> str:
    now = datetime.now(timezone.utc)
    data["created_at"] = now
    data["updated_at"] = now
    result = await db.workflow_runs.insert_one(data)
    return str(result.inserted_id)


async def get_workflow(
    db: AsyncIOMotorDatabase, tenant_id: str, workflow_id: str
) -> WorkflowRun | None:
    doc = await db.workflow_runs.find_one(
        {"_id": ObjectId(workflow_id), "tenant_id": tenant_id}
    )
    return WorkflowRun(**doc) if doc else None


async def list_workflows(
    db: AsyncIOMotorDatabase,
    tenant_id: str,
    skip: int,
    limit: int,
    status: str | None = None,
) -> list[WorkflowRun]:
    query: dict = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    cursor = db.workflow_runs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    return [WorkflowRun(**d) for d in await cursor.to_list(length=limit)]


async def count_workflows(
    db: AsyncIOMotorDatabase, tenant_id: str, status: str | None = None
) -> int:
    query: dict = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    return await db.workflow_runs.count_documents(query)


async def update_workflow_status(
    db: AsyncIOMotorDatabase,
    tenant_id: str,
    workflow_id: str,
    status: str,
) -> bool:
    updates: dict = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if status == "running":
        updates["started_at"] = datetime.now(timezone.utc)
    elif status in ("completed", "failed", "cancelled"):
        updates["finished_at"] = datetime.now(timezone.utc)
    result = await db.workflow_runs.update_one(
        {"_id": ObjectId(workflow_id), "tenant_id": tenant_id},
        {"$set": updates},
    )
    return result.modified_count > 0


# ── task_runs ──


async def create_task_run(db: AsyncIOMotorDatabase, data: dict) -> str:
    now = datetime.now(timezone.utc)
    data["created_at"] = now
    data["updated_at"] = now
    result = await db.task_runs.insert_one(data)
    return str(result.inserted_id)


async def list_task_runs(
    db: AsyncIOMotorDatabase, tenant_id: str, workflow_run_id: str
) -> list[TaskRun]:
    cursor = db.task_runs.find(
        {"tenant_id": tenant_id, "workflow_run_id": workflow_run_id}
    ).sort("created_at", 1)
    return [TaskRun(**d) for d in await cursor.to_list(length=100)]


async def get_task_run(
    db: AsyncIOMotorDatabase, tenant_id: str, task_id: str
) -> TaskRun | None:
    doc = await db.task_runs.find_one(
        {"_id": ObjectId(task_id), "tenant_id": tenant_id}
    )
    return TaskRun(**doc) if doc else None


async def update_task_status(
    db: AsyncIOMotorDatabase, tenant_id: str, task_id: str, status: str
) -> bool:
    updates: dict = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if status == "running":
        updates["started_at"] = datetime.now(timezone.utc)
    elif status in ("completed", "failed", "skipped"):
        updates["finished_at"] = datetime.now(timezone.utc)
    result = await db.task_runs.update_one(
        {"_id": ObjectId(task_id), "tenant_id": tenant_id},
        {"$set": updates},
    )
    return result.modified_count > 0
