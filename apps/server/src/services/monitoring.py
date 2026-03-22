"""Monitoring service — read-only views of execution data."""

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.jobs import JobMatch, JobMatchUpdate, JobPosting
from models.runs import ApplicationAttempt, ApplicationRun, FetchRun


class MonitoringService:

    async def list_application_runs(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                    skip: int, limit: int,
                                    status: str | None = None) -> list[ApplicationRun]:
        query: dict = {"tenant_id": tenant_id}
        if status:
            query["status"] = status
        cursor = db.application_runs.find(query).sort("created_at", -1).skip(skip).limit(limit)
        return [ApplicationRun(**d) for d in await cursor.to_list(length=limit)]

    async def get_application_run(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                  run_id: str) -> ApplicationRun | None:
        doc = await db.application_runs.find_one(
            {"_id": ObjectId(run_id), "tenant_id": tenant_id}
        )
        return ApplicationRun(**doc) if doc else None

    async def list_attempts(self, db: AsyncIOMotorDatabase, tenant_id: str,
                            run_id: str) -> list[ApplicationAttempt]:
        cursor = db.application_attempts.find(
            {"tenant_id": tenant_id, "application_run_id": run_id}
        ).sort("attempt_number", 1)
        return [ApplicationAttempt(**d) for d in await cursor.to_list(length=50)]

    async def list_fetch_runs(self, db: AsyncIOMotorDatabase, tenant_id: str,
                              skip: int, limit: int,
                              status: str | None = None) -> list[FetchRun]:
        query: dict = {"tenant_id": tenant_id}
        if status:
            query["status"] = status
        cursor = db.fetch_runs.find(query).sort("created_at", -1).skip(skip).limit(limit)
        return [FetchRun(**d) for d in await cursor.to_list(length=limit)]

    async def list_job_postings(self, db: AsyncIOMotorDatabase, tenant_id: str,
                                skip: int, limit: int,
                                company: str | None = None) -> list[JobPosting]:
        query: dict = {"tenant_id": tenant_id}
        if company:
            query["company"] = {"$regex": company, "$options": "i"}
        cursor = db.job_postings.find(query).sort("created_at", -1).skip(skip).limit(limit)
        return [JobPosting(**d) for d in await cursor.to_list(length=limit)]

    async def list_job_matches(self, db: AsyncIOMotorDatabase, tenant_id: str,
                               skip: int, limit: int, user_id: str | None = None,
                               status: str | None = None) -> list[JobMatch]:
        query: dict = {"tenant_id": tenant_id}
        if user_id:
            query["user_id"] = user_id
        if status:
            query["status"] = status
        cursor = db.job_matches.find(query).sort("created_at", -1).skip(skip).limit(limit)
        return [JobMatch(**d) for d in await cursor.to_list(length=limit)]

    async def update_job_match(self, db: AsyncIOMotorDatabase, tenant_id: str,
                               match_id: str, body: JobMatchUpdate) -> JobMatch | None:
        """Returns updated model, or None if not found/empty."""
        updates = body.model_dump(exclude_unset=True)
        if not updates:
            return None
        updates["updated_at"] = datetime.now(timezone.utc)
        result = await db.job_matches.update_one(
            {"_id": ObjectId(match_id), "tenant_id": tenant_id}, {"$set": updates}
        )
        if result.matched_count == 0:
            return None
        doc = await db.job_matches.find_one(
            {"_id": ObjectId(match_id), "tenant_id": tenant_id}
        )
        return JobMatch(**doc) if doc else None
