"""Global manager that coordinates flow groups and runtime tasks."""

import asyncio
from typing import TYPE_CHECKING, Any

from bot.control.group import FlowGroup
from bot.exceptions import BotShutdownError

if TYPE_CHECKING:
    from bot.control.controller import BotController


class BotManager:
    """Controls all groups and exposes global checkpoints."""

    def __init__(self) -> None:
        self._groups: dict[str, FlowGroup] = {}
        self._tasks: dict[str, asyncio.Task[Any]] = {}
        self._event = asyncio.Event()
        self._event.set()
        self._stopped = False

    def add_group(self, group: FlowGroup) -> None:
        """Register a new flow group."""
        if group.group_id in self._groups:
            raise KeyError(f"Group {group.group_id} already exists")
        self._groups[group.group_id] = group

    def remove_group(self, group_id: str) -> None:
        """Remove an existing flow group."""
        if group_id not in self._groups:
            raise KeyError(f"Group {group_id} not found")
        del self._groups[group_id]

    def get_group(self, group_id: str) -> FlowGroup:
        """Return a registered flow group."""
        if group_id not in self._groups:
            raise KeyError(f"Group {group_id} not found")
        return self._groups[group_id]

    def pause_group(self, group_id: str) -> None:
        """Pause one group by id."""
        self.get_group(group_id).pause()

    def resume_group(self, group_id: str) -> None:
        """Resume one group by id."""
        self.get_group(group_id).resume()

    def stop_group(self, group_id: str) -> None:
        """Stop one group by id."""
        self.get_group(group_id).stop()

    def pause_all(self) -> None:
        """Pause all groups and block global checkpoint."""
        self._event.clear()
        for group in self._groups.values():
            group.pause()

    def resume_all(self) -> None:
        """Resume all groups and unblock global checkpoint."""
        self._event.set()
        for group in self._groups.values():
            group.resume()

    def stop_all(self) -> None:
        """Stop every group and set global shutdown flag."""
        self._stopped = True
        self._event.set()
        for group in self._groups.values():
            group.stop()

    async def checkpoint(self) -> None:
        """Wait for resume and raise on global shutdown."""
        await self._event.wait()
        if self._stopped:
            raise BotShutdownError()

    def get_controller(self, flow_id: str) -> "BotController":
        """Search all groups for a flow controller."""
        for group in self._groups.values():
            ctrl = group._controllers.get(flow_id)
            if ctrl is not None:
                return ctrl
        raise KeyError(f"Flow {flow_id} not found")

    def add_task(self, flow_id: str, task: asyncio.Task[Any]) -> None:
        """Store running asyncio task keyed by flow id."""
        self._tasks[flow_id] = task

    def get_task(self, flow_id: str) -> asyncio.Task[Any]:
        """Return running task by flow id."""
        if flow_id not in self._tasks:
            raise KeyError(f"Task for flow {flow_id} not found")
        return self._tasks[flow_id]

    def remove_task(self, flow_id: str) -> None:
        """Remove task mapping for a flow id."""
        if flow_id not in self._tasks:
            raise KeyError(f"Task for flow {flow_id} not found")
        del self._tasks[flow_id]

    def all_flow_ids(self) -> list[str]:
        """Return all registered flow ids across all groups."""
        flow_ids: list[str] = []
        for group in self._groups.values():
            flow_ids.extend(group._controllers.keys())
        return flow_ids

