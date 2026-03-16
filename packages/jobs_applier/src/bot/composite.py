"""Top-level flow state machine and browser lifecycle orchestration."""

from transitions import Machine

from bot.context import FlowContext
from bot.control.checkpoint import checkpoint
from bot.control.controller import BotController
from bot.control.group import FlowGroup
from bot.control.manager import BotManager
from bot.exceptions import BotShutdownError, FlowGroupStoppedError, FlowStoppedError
from bot.flows.base import SubFlow
from bot.flows.job_apply import JobApplySubFlow
from bot.flows.login import LoginSubFlow
from bot.flows.redirect import RedirectSubFlow
from bot.flows.signup import SignupSubFlow
from bot.persistence import persist

try:
    from camoufox import AsyncCamoufox
except ImportError:  # pragma: no cover
    from camoufox.async_api import AsyncCamoufox


class CompositeFlow:
    """Runs login -> signup -> job_apply -> redirect sub-flows."""

    states = ["login", "signup", "job_apply", "redirect", "completed", "failed"]
    SUBFLOWS: dict[str, SubFlow] = {
        "login": LoginSubFlow(),
        "signup": SignupSubFlow(),
        "job_apply": JobApplySubFlow(),
        "redirect": RedirectSubFlow(),
    }

    def __init__(self, ctx: FlowContext) -> None:
        self.ctx = ctx
        self.machine = Machine(
            model=self,
            states=self.states,
            transitions=[
                {"trigger": "done", "source": "login", "dest": "signup"},
                {"trigger": "done", "source": "signup", "dest": "job_apply"},
                {"trigger": "done", "source": "job_apply", "dest": "redirect"},
                {"trigger": "done", "source": "redirect", "dest": "completed"},
                {"trigger": "fail", "source": "*", "dest": "failed"},
            ],
            initial=ctx.active_subflow,
            auto_transitions=False,
        )

    def on_enter_login(self) -> None:
        self.ctx.active_subflow = "login"

    def on_enter_signup(self) -> None:
        self.ctx.active_subflow = "signup"

    def on_enter_job_apply(self) -> None:
        self.ctx.active_subflow = "job_apply"

    def on_enter_redirect(self) -> None:
        self.ctx.active_subflow = "redirect"

    def on_enter_completed(self) -> None:
        print(f"[{self.ctx.flow_id}][composite][completed] flow completed successfully")

    def on_enter_failed(self) -> None:
        print(f"[{self.ctx.flow_id}][composite][failed] errors={self.ctx.errors}")

    async def run(
        self,
        ctrl: BotController,
        group: FlowGroup,
        manager: BotManager,
    ) -> None:
        """Run the full sub-flow FSM inside a managed browser session."""
        ctrl._ctx = self.ctx
        async with AsyncCamoufox(headless=False, humanize=True, geoip=True) as browser:
            self.ctx.browser_ctx = await browser.new_context(locale="en-US")
            self.ctx.page = await self.ctx.browser_ctx.new_page()
            try:
                while self.state not in ("completed", "failed"):
                    await checkpoint(ctrl, group, manager)
                    subflow = self.SUBFLOWS[self.state]
                    await subflow.run(
                        ctx=self.ctx,
                        ctrl=ctrl,
                        group=group,
                        manager=manager,
                        on_done=self.done,
                        on_fail=self.fail,
                    )
                    self.ctx.last_step_in_subflow = ""
            except (FlowStoppedError, FlowGroupStoppedError, BotShutdownError) as exc:
                print(f"[{self.ctx.flow_id}][composite][halted] {exc}")
                await persist(self.ctx)
            finally:
                if self.ctx.browser_ctx is not None:
                    await self.ctx.browser_ctx.close()
                self.ctx.page = None
                self.ctx.browser_ctx = None

