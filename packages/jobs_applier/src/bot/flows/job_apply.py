"""Job application sub-flow stub for form submission steps."""

from bot.context import FlowContext
from bot.flows.base import SubFlow


class JobApplySubFlow(SubFlow):
    """Sub-flow placeholder for application form execution."""

    name = "job_apply"

    def __init__(self) -> None:
        self.steps = [
            ("open_application", self._open_application),
            ("answer_questions", self._answer_questions),
            ("review_and_submit", self._review_and_submit),
        ]

    async def _open_application(self, ctx: FlowContext) -> None:
        """Open the target job application form page."""
        raise NotImplementedError("open_application is not implemented")

    async def _answer_questions(self, ctx: FlowContext) -> None:
        """Fill required screening and custom application questions."""
        raise NotImplementedError("answer_questions is not implemented")

    async def _review_and_submit(self, ctx: FlowContext) -> None:
        """Review completed fields then submit the application."""
        raise NotImplementedError("review_and_submit is not implemented")

