"""Single pause/stop gate across manager, group, and flow controller."""

from bot.control.controller import BotController
from bot.control.group import FlowGroup
from bot.control.manager import BotManager


async def checkpoint(
    ctrl: BotController,
    group: FlowGroup,
    manager: BotManager,
) -> None:
    """Check global, group, then flow-level execution gates."""
    await manager.checkpoint()
    await group.checkpoint()
    await ctrl.checkpoint()

