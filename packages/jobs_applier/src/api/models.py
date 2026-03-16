"""Pydantic request and response models for bot API endpoints."""

from typing import Any

from pydantic import BaseModel, ConfigDict


class CreateGroupRequest(BaseModel):
    """Request body for creating a new group."""

    group_id: str


class CreateFlowRequest(BaseModel):
    """Request body for creating and starting a new flow."""

    flow_id: str
    group_id: str
    platform: str
    target_url: str
    credentials: dict[str, str]
    resume: bool = False


class FlowStatus(BaseModel):
    """Status view for one flow controller and context."""

    model_config = ConfigDict(from_attributes=True)

    flow_id: str
    platform: str
    control_state: str
    active_subflow: str
    last_step: str
    errors: list[dict[str, Any]]
    updated_at: str


class GroupStatus(BaseModel):
    """Status view for one flow group."""

    model_config = ConfigDict(from_attributes=True)

    group_id: str
    state: str
    flows: list[FlowStatus]


class GlobalStatus(BaseModel):
    """Status view for the global manager."""

    model_config = ConfigDict(from_attributes=True)

    state: str
    groups: list[GroupStatus]


class ActionResponse(BaseModel):
    """Generic API action response."""

    model_config = ConfigDict(from_attributes=True)

    ok: bool
    detail: str


class FlowErrorsResponse(BaseModel):
    """Error list response for a specific flow."""

    model_config = ConfigDict(from_attributes=True)

    flow_id: str
    errors: list[dict[str, Any]]

