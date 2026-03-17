"""Base sub-flow orchestration with resumability and step persistence."""

import traceback
from abc import ABC
from collections.abc import Awaitable, Callable
from typing import Any

from bot.context import FlowContext
from bot.control.checkpoint import checkpoint
from bot.control.controller import BotController
from bot.control.group import FlowGroup
from bot.control.manager import BotManager
from bot.exceptions import BotShutdownError, FlowGroupStoppedError, FlowStoppedError
from bot.persistence import persist


class SubFlow(ABC):
    """Abstract sub-flow that executes a sequence of checkpointed steps."""

    name: str
    steps: list[tuple[str, Callable[[FlowContext], Awaitable[None]]]]

    async def run(
        self,
        ctx: FlowContext,
        ctrl: BotController,
        group: FlowGroup,
        manager: BotManager,
        on_done: Callable[[], None],
        on_fail: Callable[[], None],
    ) -> None:
        """Run sub-flow steps with resume support and per-step persistence."""
        step_names = [name for name, _ in self.steps]
        if (
            ctx.active_subflow == self.name
            and ctx.last_step_in_subflow
            and ctx.last_step_in_subflow in step_names
        ):
            start_idx = step_names.index(ctx.last_step_in_subflow) + 1
        else:
            start_idx = 0

        current_step_name = ""
        try:
            for current_step_name, fn in self.steps[start_idx:]:
                await checkpoint(ctrl, group, manager)
                await fn(ctx)
                ctx.last_step_in_subflow = current_step_name
                await persist(ctx)

            on_done()
        except (FlowStoppedError, FlowGroupStoppedError, BotShutdownError):
            raise
        except Exception as exc:
            ctx.errors.append(
                {
                    "subflow": self.name,
                    "step": current_step_name,
                    "error": str(exc),
                    "traceback": traceback.format_exc(),
                }
            )
            on_fail()

