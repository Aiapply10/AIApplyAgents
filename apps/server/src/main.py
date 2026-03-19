"""Control Service — FastAPI application."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import dependencies
from config import settings
from db import close_db, init_db
from routers.admin import router as admin_router
from routers.monitoring import router as monitoring_router
from routers.policies import router as policies_router
from routers.preferences import router as preferences_router
from routers.profiles import router as profiles_router
from routers.tenants import router as tenants_router
from routers.users import router as users_router
from routers.resumes import router as resumes_router
from routers.master_sections import router as master_sections_router
from routers.workflows import router as workflows_router
from supertokens_config import init_supertokens


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    await init_db(settings.mongodb_uri, settings.db_name)
    await _ensure_default_tenant()
    await _ensure_admin_user()
    yield
    await close_db()


async def _ensure_default_tenant() -> None:
    """Create the default tenant if it doesn't exist, store its ID globally."""
    from db import get_db
    import supertokens_config

    db = get_db()
    tenant = await db.tenants.find_one({"slug": "default"})
    if not tenant:
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        result = await db.tenants.insert_one(
            {
                "name": "Default",
                "slug": "default",
                "plan": "free",
                "settings": {},
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
        )
        supertokens_config.DEFAULT_TENANT_ID = str(result.inserted_id)
    else:
        supertokens_config.DEFAULT_TENANT_ID = str(tenant["_id"])

    # Backfill any users with null tenant_id
    await db.users.update_many(
        {"tenant_id": None},
        {"$set": {"tenant_id": supertokens_config.DEFAULT_TENANT_ID}},
    )


async def _ensure_admin_user() -> None:
    """Promote the configured admin_email to admin role on startup."""
    if not settings.admin_email:
        return
    from db import get_db

    db = get_db()
    result = await db.users.update_one(
        {"email": settings.admin_email},
        {"$set": {"role": "admin"}},
    )
    if result.modified_count > 0:
        print(f"[RBAC] Promoted {settings.admin_email} to admin")
    elif result.matched_count > 0:
        pass  # already admin
    else:
        print(f"[RBAC] No user found with email {settings.admin_email} — will promote on next startup after signup")


# SuperTokens must be initialised before the app is created
init_supertokens(settings)

app = FastAPI(title="Control Service", version="0.1.0", lifespan=lifespan)

# Starlette middleware is LIFO: last add_middleware = outermost.
# CORS must be outermost, so add SuperTokens first, then CORS.
from supertokens_python.framework.fastapi import get_middleware
from supertokens_python.recipe.session.framework.fastapi import verify_session

app.add_middleware(get_middleware())

from supertokens_python import get_all_cors_headers

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"] + get_all_cors_headers(),
)

app.include_router(tenants_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(preferences_router)
app.include_router(policies_router)
app.include_router(workflows_router)
app.include_router(resumes_router)
app.include_router(master_sections_router)
app.include_router(monitoring_router)
app.include_router(admin_router)


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment}


@app.get("/me")
async def me(
    current_user: dependencies.CurrentUser,
) -> dict:
    return {
        "id": str(current_user["_id"]),
        "email": current_user.get("email", ""),
        "display_name": current_user.get("display_name", ""),
        "role": current_user.get("role", "member"),
    }
