"""Control endpoints for global, group, and flow lifecycle actions."""

from fastapi import APIRouter, Depends, Response

from api.dependencies import get_manager
from api.models import ActionResponse
from bot.control.manager import BotManager

router = APIRouter(prefix="/control", tags=["control"])


def _handle_exception(response: Response, exc: Exception) -> ActionResponse:
    if isinstance(exc, KeyError):
        response.status_code = 404
        return ActionResponse(ok=False, detail=f"{exc.args[0]} not found")
    response.status_code = 500
    return ActionResponse(ok=False, detail=str(exc))


@router.post("/all/pause", response_model=ActionResponse)
async def pause_all(
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        manager.pause_all()
        return ActionResponse(ok=True, detail="All flows paused")
    except Exception as exc:
        return _handle_exception(response, exc)


@router.post("/all/resume", response_model=ActionResponse)
async def resume_all(
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        manager.resume_all()
        return ActionResponse(ok=True, detail="All flows resumed")
    except Exception as exc:
        return _handle_exception(response, exc)


@router.post("/all/stop", response_model=ActionResponse)
async def stop_all(
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        manager.stop_all()
        return ActionResponse(ok=True, detail="All flows stopped")
    except Exception as exc:
        return _handle_exception(response, exc)


@router.post("/group/{group_id}/pause", response_model=ActionResponse)
async def pause_group(
    group_id: str,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        manager.pause_group(group_id)
        return ActionResponse(ok=True, detail=f"Group {group_id} paused")
    except Exception as exc:
        return _handle_exception(response, exc)


@router.post("/group/{group_id}/resume", response_model=ActionResponse)
async def resume_group(
    group_id: str,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        manager.resume_group(group_id)
        return ActionResponse(ok=True, detail=f"Group {group_id} resumed")
    except Exception as exc:
        return _handle_exception(response, exc)


@router.post("/group/{group_id}/stop", response_model=ActionResponse)
async def stop_group(
    group_id: str,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        manager.stop_group(group_id)
        return ActionResponse(ok=True, detail=f"Group {group_id} stopped")
    except Exception as exc:
        return _handle_exception(response, exc)


@router.post("/flow/{flow_id}/pause", response_model=ActionResponse)
async def pause_flow(
    flow_id: str,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        ctrl = manager.get_controller(flow_id)
        ctrl.pause()
        return ActionResponse(ok=True, detail=f"Flow {flow_id} paused")
    except Exception as exc:
        return _handle_exception(response, exc)


@router.post("/flow/{flow_id}/resume", response_model=ActionResponse)
async def resume_flow(
    flow_id: str,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        ctrl = manager.get_controller(flow_id)
        ctrl.resume()
        return ActionResponse(ok=True, detail=f"Flow {flow_id} resumed")
    except Exception as exc:
        return _handle_exception(response, exc)


@router.post("/flow/{flow_id}/stop", response_model=ActionResponse)
async def stop_flow(
    flow_id: str,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        ctrl = manager.get_controller(flow_id)
        ctrl.stop()
        return ActionResponse(ok=True, detail=f"Flow {flow_id} stopped")
    except Exception as exc:
        return _handle_exception(response, exc)

