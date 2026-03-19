"""Artifact model — screenshots, filled forms, logs."""

from typing import Any

from models.base import PyObjectId, TenantDoc


class Artifact(TenantDoc):
    parent_type: str  # application_run, attempt
    parent_id: PyObjectId
    artifact_type: str  # screenshot, html, pdf, log
    filename: str
    storage_key: str
    mime_type: str
    size_bytes: int
    metadata: dict[str, Any] = {}
