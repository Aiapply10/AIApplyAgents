"""Redirect handling sub-flow stub for post-submit outcomes."""

from bot.context import FlowContext
from bot.flows.base import SubFlow


class RedirectSubFlow(SubFlow):
    """Sub-flow placeholder for redirect tracking and result capture."""

    name = "redirect"

    def __init__(self) -> None:
        self.steps = [
            ("follow_redirect", self._follow_redirect),
            ("capture_screenshot", self._capture_screenshot),
            ("save_result", self._save_result),
        ]

    async def _follow_redirect(self, ctx: FlowContext) -> None:
        """Follow final redirect chain to destination outcome page."""
        raise NotImplementedError("follow_redirect is not implemented")

    async def _capture_screenshot(self, ctx: FlowContext) -> None:
        """Capture evidence screenshot of final post-submit state."""
        raise NotImplementedError("capture_screenshot is not implemented")

    async def _save_result(self, ctx: FlowContext) -> None:
        """Persist final redirect URL and completion artifacts."""
        raise NotImplementedError("save_result is not implemented")

