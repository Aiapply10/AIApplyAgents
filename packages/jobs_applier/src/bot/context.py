"""Execution context model shared by all bot sub-flows."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class FlowContext:
    """Holds identity, runtime references, and resumability metadata."""

    # Identity
    flow_id: str
    platform: str
    target_url: str
    credentials: dict[str, str]

    # Runtime — never persisted
    page: Any | None = field(default=None, repr=False)
    browser_ctx: Any | None = field(default=None, repr=False)

    # Written by sub-flows
    session_token: str | None = None
    user_profile: dict[str, Any] | None = None
    application_id: str | None = None
    final_url: str | None = None

    # Resumability
    active_subflow: str = "login"
    last_step_in_subflow: str = ""

    # Audit
    errors: list[dict[str, Any]] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def serializable(self) -> dict[str, Any]:
        """Return serializable context fields excluding runtime page handles."""
        self.updated_at = datetime.utcnow().isoformat()
        return {
            "flow_id": self.flow_id,
            "platform": self.platform,
            "target_url": self.target_url,
            "credentials": self.credentials,
            "session_token": self.session_token,
            "user_profile": self.user_profile,
            "application_id": self.application_id,
            "final_url": self.final_url,
            "active_subflow": self.active_subflow,
            "last_step_in_subflow": self.last_step_in_subflow,
            "errors": self.errors,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FlowContext":
        """Reconstruct a context from persisted dictionary data."""
        return cls(
            flow_id=data["flow_id"],
            platform=data["platform"],
            target_url=data["target_url"],
            credentials=data["credentials"],
            session_token=data.get("session_token"),
            user_profile=data.get("user_profile"),
            application_id=data.get("application_id"),
            final_url=data.get("final_url"),
            active_subflow=data.get("active_subflow", "login"),
            last_step_in_subflow=data.get("last_step_in_subflow", ""),
            errors=data.get("errors", []),
            created_at=data.get("created_at", datetime.utcnow().isoformat()),
            updated_at=data.get("updated_at", datetime.utcnow().isoformat()),
        )

