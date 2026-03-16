"""Platform-level coordinator for multiple flow controllers."""

import asyncio

from bot.control.controller import BotController
from bot.exceptions import FlowGroupStoppedError


class FlowGroup:
    """Controls pause/resume/stop for all flows in one platform group."""

    def __init__(self, group_id: str) -> None:
        self.group_id = group_id
        self._controllers: dict[str, BotController] = {}
        self._event = asyncio.Event()
        self._event.set()
        self._stopped = False

    def register(self, ctrl: BotController) -> None:
        """Register a controller to this group."""
        if ctrl.flow_id in self._controllers:
            raise KeyError(f"Flow {ctrl.flow_id} already exists in group {self.group_id}")
        self._controllers[ctrl.flow_id] = ctrl

    def deregister(self, flow_id: str) -> None:
        """Remove a controller from this group."""
        if flow_id not in self._controllers:
            raise KeyError(f"Flow {flow_id} not found in group {self.group_id}")
        del self._controllers[flow_id]

    def pause(self) -> None:
        """Pause the group and any running controllers."""
        self._event.clear()
        for ctrl in self._controllers.values():
            if ctrl.state == "running":
                ctrl.pause()

    def resume(self) -> None:
        """Resume the group and any paused controllers."""
        self._event.set()
        for ctrl in self._controllers.values():
            if ctrl.state == "paused":
                ctrl.resume()

    def stop(self) -> None:
        """Stop the group and all active controllers."""
        self._stopped = True
        self._event.set()
        for ctrl in self._controllers.values():
            if ctrl.state in {"running", "paused"}:
                ctrl.stop()

    async def checkpoint(self) -> None:
        """Wait for group resume and raise if group is stopped."""
        await self._event.wait()
        if self._stopped:
            raise FlowGroupStoppedError(self.group_id)

