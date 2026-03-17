"""Configuration endpoints for creating and removing groups/flows."""

import asyncio

from fastapi import APIRouter, Depends, Response

from api.dependencies import get_manager
from api.models import ActionResponse, CreateFlowRequest, CreateGroupRequest
from bot.composite import CompositeFlow
from bot.context import FlowContext
from bot.control.controller import BotController
from bot.control.group import FlowGroup
from bot.control.manager import BotManager
from bot.persistence import load_context

router = APIRouter(prefix="/config", tags=["config"])


def _error(response: Response, code: int, detail: str) -> ActionResponse:
    response.status_code = code
    return ActionResponse(ok=False, detail=detail)


@router.post("/group", response_model=ActionResponse)
async def create_group(
    body: CreateGroupRequest,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    if body.group_id in manager._groups:
        return _error(response, 409, "Group already exists")
    try:
        group = FlowGroup(body.group_id)
        manager.add_group(group)
        return ActionResponse(ok=True, detail=f"Group {body.group_id} created")
    except Exception as exc:
        return _error(response, 500, str(exc))


@router.post("/flow", response_model=ActionResponse)
async def create_flow(
    body: CreateFlowRequest,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    if body.group_id not in manager._groups:
        return _error(response, 404, f"Group {body.group_id} not found")
    if body.flow_id in manager.all_flow_ids():
        return _error(response, 409, "Flow already exists")

    try:
        if body.resume:
            ctx = await load_context(body.flow_id)
            if ctx is None:
                return _error(response, 404, f"No saved context for {body.flow_id}")
        else:
            ctx = FlowContext(
                flow_id=body.flow_id,
                platform=body.platform,
                target_url=body.target_url,
                credentials=body.credentials,
            )

        group = manager.get_group(body.group_id)
        ctrl = BotController(body.flow_id)
        ctrl._ctx = ctx
        group.register(ctrl)
        ctrl.start()

        task = asyncio.create_task(
            CompositeFlow(ctx).run(ctrl, group, manager),
            name=f"flow-{body.flow_id}",
        )
        manager.add_task(body.flow_id, task)
        return ActionResponse(ok=True, detail=f"Flow {body.flow_id} started")
    except KeyError as exc:
        return _error(response, 404, exc.args[0])
    except Exception as exc:
        return _error(response, 500, str(exc))


@router.delete("/flow/{flow_id}", response_model=ActionResponse)
async def delete_flow(
    flow_id: str,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        ctrl = manager.get_controller(flow_id)
        task = manager.get_task(flow_id)

        if ctrl.state in {"running", "paused"}:
            ctrl.stop()
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)

        for group in manager._groups.values():
            if flow_id in group._controllers:
                group.deregister(flow_id)
                break

        manager.remove_task(flow_id)
        return ActionResponse(ok=True, detail=f"Flow {flow_id} removed")
    except KeyError as exc:
        return _error(response, 404, exc.args[0])
    except Exception as exc:
        return _error(response, 500, str(exc))


@router.delete("/group/{group_id}", response_model=ActionResponse)
async def delete_group(
    group_id: str,
    response: Response,
    manager: BotManager = Depends(get_manager),
) -> ActionResponse:
    try:
        group = manager.get_group(group_id)
        flow_ids = list(group._controllers.keys())

        group.stop()
        for flow_id in flow_ids:
            task = manager.get_task(flow_id)
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            manager.remove_task(flow_id)
            group.deregister(flow_id)

        manager.remove_group(group_id)
        return ActionResponse(ok=True, detail=f"Group {group_id} removed")
    except KeyError as exc:
        return _error(response, 404, exc.args[0])
    except Exception as exc:
        return _error(response, 500, str(exc))

