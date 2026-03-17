"""Signup sub-flow stub for profile completion actions."""

from bot.context import FlowContext
from bot.flows.base import SubFlow


class SignupSubFlow(SubFlow):
    """Sub-flow placeholder for signup/profile setup steps."""

    name = "signup"

    def __init__(self) -> None:
        self.steps = [
            ("navigate_profile", self._navigate_profile),
            ("fill_profile", self._fill_profile),
            ("upload_resume", self._upload_resume),
        ]

    async def _navigate_profile(self, ctx: FlowContext) -> None:
        """Open the user profile or onboarding page before data entry."""
        raise NotImplementedError("navigate_profile is not implemented")

    async def _fill_profile(self, ctx: FlowContext) -> None:
        """Populate profile form fields with user information."""
        raise NotImplementedError("fill_profile is not implemented")

    async def _upload_resume(self, ctx: FlowContext) -> None:
        """Upload the user resume and validate upload completion."""
        raise NotImplementedError("upload_resume is not implemented")

