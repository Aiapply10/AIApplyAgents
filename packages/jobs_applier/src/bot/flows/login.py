"""Scaffolded login sub-flow that demonstrates the step pattern."""

from bot.context import FlowContext
from bot.flows.base import SubFlow


class LoginSubFlow(SubFlow):
    """Reference sub-flow implementation with stubbed browser steps."""

    name = "login"

    def __init__(self) -> None:
        self.steps = [
            ("open_page", self._open_page),
            ("fill_credentials", self._fill_credentials),
            ("verify_session", self._verify_session),
        ]

    async def _open_page(self, ctx: FlowContext) -> None:
        """
        TODO: Navigate to login page and wait for form to appear.
        Example:
          await ctx.page.goto(ctx.target_url + "/login", wait_until="networkidle")
          await ctx.page.wait_for_selector("input[type=email]", timeout=10_000)
        """
        print(f"[{ctx.flow_id}][login][open_page] stub")

    async def _fill_credentials(self, ctx: FlowContext) -> None:
        """
        TODO: Type email and password with human-like delays, submit form.
        Example:
          await ctx.page.locator("input[type=email]").click()
          await ctx.page.keyboard.type(ctx.credentials["email"], delay=85)
          await ctx.page.locator("input[type=password]").click()
          await ctx.page.keyboard.type(ctx.credentials["password"], delay=90)
          await ctx.page.locator("button[type=submit]").click()
          await ctx.page.wait_for_load_state("networkidle", timeout=15_000)
        """
        print(f"[{ctx.flow_id}][login][fill_credentials] stub")

    async def _verify_session(self, ctx: FlowContext) -> None:
        """
        TODO: Confirm login succeeded by checking for a session cookie.
        Set ctx.session_token on success. Raise ValueError on failure.
        Example:
          cookies = await ctx.browser_ctx.cookies()
          match = next((c for c in cookies if c["name"] in {"li_at", "session"}), None)
          if not match:
            raise ValueError("No session cookie found after login")
          ctx.session_token = match["value"]
        """
        print(f"[{ctx.flow_id}][login][verify_session] stub")
        ctx.session_token = "stub_token"

