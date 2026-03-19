"""SuperTokens initialisation — recipes, overrides, and post-signup hooks."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from supertokens_python import InputAppInfo, SupertokensConfig, init
from supertokens_python.recipe import emailpassword, session, thirdparty
from supertokens_python.recipe.emailpassword.interfaces import (
    RecipeInterface as EPRecipeInterface,
    SignUpOkResult,
)
from supertokens_python.recipe.session import SessionContainer
from supertokens_python.recipe.thirdparty.interfaces import (
    RecipeInterface as TPRecipeInterface,
    SignInUpOkResult,
)
from supertokens_python.recipe.thirdparty.provider import (
    ProviderClientConfig,
    ProviderConfig,
    ProviderInput,
)
from supertokens_python.types import RecipeUserId, User


def init_supertokens(settings: Any) -> None:
    """Call once at startup before the app begins serving requests."""
    init(
        app_info=InputAppInfo(
            app_name="AI Apply Agents",
            api_domain=settings.api_domain,
            website_domain=settings.website_domain,
            api_base_path="/auth",
            website_base_path="/auth",
        ),
        supertokens_config=SupertokensConfig(
            connection_uri=settings.supertokens_connection_uri,
            api_key=settings.supertokens_api_key,
        ),
        framework="fastapi",
        recipe_list=[
            emailpassword.init(
                override=emailpassword.InputOverrideConfig(
                    functions=_override_emailpassword,
                ),
            ),
            thirdparty.init(
                sign_in_and_up_feature=thirdparty.SignInAndUpFeature(
                    providers=[
                        ProviderInput(
                            config=ProviderConfig(
                                third_party_id="google",
                                clients=[
                                    ProviderClientConfig(
                                        client_id=settings.google_client_id,
                                        client_secret=settings.google_client_secret,
                                    ),
                                ],
                            ),
                        ),
                    ],
                ),
                override=thirdparty.InputOverrideConfig(
                    functions=_override_thirdparty,
                ),
            ),
            session.init(),
        ],
        mode="asgi",
    )


# Set by main.py lifespan after ensuring the default tenant exists.
DEFAULT_TENANT_ID: str | None = None


# ── Post-signup hook: create MongoDB user record ──


async def _create_app_user(supertokens_user_id: str, email: str) -> None:
    """Insert a linked user document into our MongoDB users collection."""
    from db import get_db

    db = get_db()
    now = datetime.now(timezone.utc)
    await db.users.insert_one(
        {
            "supertokens_user_id": supertokens_user_id,
            "tenant_id": DEFAULT_TENANT_ID,
            "email": email,
            "display_name": email.split("@")[0],
            "role": "member",
            "is_active": True,
            "last_login_at": None,
            "created_at": now,
            "updated_at": now,
        }
    )


def _override_emailpassword(
    original: EPRecipeInterface,
) -> EPRecipeInterface:
    original_sign_up = original.sign_up

    async def sign_up(
        email: str,
        password: str,
        tenant_id: str,
        session: Optional[SessionContainer],
        should_try_linking_with_session_user: bool,
        user_context: Dict[str, Any],
    ):
        result = await original_sign_up(
            email, password, tenant_id, session,
            should_try_linking_with_session_user, user_context,
        )
        if isinstance(result, SignUpOkResult):
            await _create_app_user(result.user.id, email)
        return result

    original.sign_up = sign_up  # type: ignore[assignment]
    return original


def _override_thirdparty(
    original: TPRecipeInterface,
) -> TPRecipeInterface:
    original_sign_in_up = original.sign_in_up

    async def sign_in_up(
        third_party_id: str,
        third_party_user_id: str,
        email: str,
        is_verified: bool,
        oauth_tokens: Dict[str, Any],
        raw_user_info_from_provider: Any,
        session: Optional[SessionContainer],
        should_try_linking_with_session_user: bool,
        tenant_id: str,
        user_context: Dict[str, Any],
    ):
        result = await original_sign_in_up(
            third_party_id, third_party_user_id, email, is_verified,
            oauth_tokens, raw_user_info_from_provider, session,
            should_try_linking_with_session_user, tenant_id, user_context,
        )
        if isinstance(result, SignInUpOkResult) and result.created_new_recipe_user:
            await _create_app_user(result.user.id, email)
        return result

    original.sign_in_up = sign_in_up  # type: ignore[assignment]
    return original
