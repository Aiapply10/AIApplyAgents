"""Shared dependency providers for FastAPI routers."""

from bot.control.manager import BotManager

_manager: BotManager = BotManager()


def get_manager() -> BotManager:
    """Return singleton bot manager used by all API routes."""
    return _manager

