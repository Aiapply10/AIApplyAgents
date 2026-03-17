"""Finite-state controller for a single flow lifecycle."""

import asyncio
from typing import TYPE_CHECKING

from transitions import Machine

from bot.exceptions import FlowStoppedError

if TYPE_CHECKING:
    from bot.context import FlowContext


class BotController:
    """Owns pause/resume/stop state for one flow."""

    states = ["idle", "running", "paused", "stopped"]

    def __init__(self, flow_id: str) -> None:
        self.flow_id = flow_id
        self._ctx: "FlowContext | None" = None
        self._event = asyncio.Event()
        self._event.set()
        self.state = "idle"
        self.machine = Machine(
            model=self,
            states=self.states,
            transitions=[
                {"trigger": "start", "source": "idle", "dest": "running"},
                {"trigger": "pause", "source": "running", "dest": "paused"},
                {"trigger": "resume", "source": "paused", "dest": "running"},
                {"trigger": "stop", "source": ["running", "paused"], "dest": "stopped"},
                {"trigger": "reset", "source": "stopped", "dest": "idle"},
            ],
            initial="idle",
            auto_transitions=False,
        )

    def on_enter_running(self) -> None:
        """Unblock execution while running."""
        self._event.set()

    def on_enter_paused(self) -> None:
        """Block execution while paused."""
        self._event.clear()

    def on_enter_stopped(self) -> None:
        """Unblock waits to raise stop signal cleanly."""
        self._event.set()

    async def checkpoint(self) -> None:
        """Wait for resume and raise if flow has been stopped."""
        await self._event.wait()
        if self.state == "stopped":
            raise FlowStoppedError(self.flow_id)

