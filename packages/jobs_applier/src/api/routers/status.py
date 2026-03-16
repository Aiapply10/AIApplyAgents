"""Status endpoints for global manager, groups, and individual flows."""

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_manager
from api.models import FlowErrorsResponse, FlowStatus, GlobalStatus, GroupStatus
from bot.control.controller import BotController
from bot.control.group import FlowGroup
from bot.control.manager import BotManager
from bot.context import FlowContext

router = APIRouter(prefix="/status", tags=["status"])


def _manager_state(manager: BotManager) -> str:
    if manager._stopped:
        return "stopped"
    if not manager._event.is_set():
        return "paused"
    return "running"


def _group_state(group: FlowGroup) -> str:
    if group._stopped:
        return "stopped"
    if not group._event.is_set():
        return "paused"
    if not group._controllers:
        return "idle"
    return "running"


def _flow_status(ctrl: BotController) -> FlowStatus:
    ctx: FlowContext | None = ctrl._ctx
    if ctx is None:
        return FlowStatus(
            flow_id=ctrl.flow_id,
            platform="unknown",
            control_state=ctrl.state,
            active_subflow="unknown",
            last_step="",
            errors=[],
            updated_at="",
        )
    return FlowStatus(
        flow_id=ctrl.flow_id,
        platform=ctx.platform,
        control_state=ctrl.state,
        active_subflow=ctx.active_subflow,
        last_step=ctx.last_step_in_subflow,
        errors=ctx.errors,
        updated_at=ctx.updated_at,
    )


def _group_status(group: FlowGroup) -> GroupStatus:
    flows = [_flow_status(ctrl) for ctrl in group._controllers.values()]
    return GroupStatus(group_id=group.group_id, state=_group_state(group), flows=flows)


@router.get("", response_model=GlobalStatus)
async def get_status(
    manager: BotManager = Depends(get_manager),
) -> GlobalStatus:
    groups = [_group_status(group) for group in manager._groups.values()]
    return GlobalStatus(state=_manager_state(manager), groups=groups)


@router.get("/group/{group_id}", response_model=GroupStatus)
async def get_group_status(
    group_id: str,
    manager: BotManager = Depends(get_manager),
) -> GroupStatus:
    try:
        group = manager.get_group(group_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=exc.args[0]) from exc
    return _group_status(group)


@router.get("/flow/{flow_id}", response_model=FlowStatus)
async def get_flow_status(
    flow_id: str,
    manager: BotManager = Depends(get_manager),
) -> FlowStatus:
    try:
        ctrl = manager.get_controller(flow_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=exc.args[0]) from exc
    return _flow_status(ctrl)


@router.get("/flow/{flow_id}/errors", response_model=FlowErrorsResponse)
async def get_flow_errors(
    flow_id: str,
    manager: BotManager = Depends(get_manager),
) -> FlowErrorsResponse:
    try:
        ctrl = manager.get_controller(flow_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=exc.args[0]) from exc
    if ctrl._ctx is None:
        raise HTTPException(status_code=404, detail=f"Context for flow {flow_id} not found")
    return FlowErrorsResponse(flow_id=flow_id, errors=ctrl._ctx.errors)

