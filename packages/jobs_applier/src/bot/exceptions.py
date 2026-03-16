"""Custom exception hierarchy for bot control and sub-flows."""


class FlowStoppedError(Exception):
    """Raised when an individual flow is stopped."""

    def __init__(self, flow_id: str) -> None:
        self.flow_id = flow_id
        super().__init__(flow_id)

    def __str__(self) -> str:
        return f"Flow '{self.flow_id}' is stopped"


class FlowGroupStoppedError(Exception):
    """Raised when a flow group is stopped."""

    def __init__(self, group_id: str) -> None:
        self.group_id = group_id
        super().__init__(group_id)

    def __str__(self) -> str:
        return f"Flow group '{self.group_id}' is stopped"


class BotShutdownError(Exception):
    """Raised when the global manager is stopped."""


class SubFlowError(Exception):
    """Wraps an exception raised inside a sub-flow step."""

    def __init__(self, subflow: str, step: str, cause: Exception) -> None:
        self.subflow = subflow
        self.step = step
        self.cause = cause
        super().__init__(f"Subflow '{subflow}' step '{step}' failed: {cause}")

