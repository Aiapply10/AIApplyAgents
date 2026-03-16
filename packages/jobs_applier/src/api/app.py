"""FastAPI app factory and lifespan for bot runtime management."""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.dependencies import get_manager
from api.routers.config import router as config_router
from api.routers.control import router as control_router
from api.routers.status import router as status_router
from bot.persistence import init_db


def create_app() -> FastAPI:
    """Create and configure the bot API application."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        await init_db()
        yield
        manager = get_manager()
        manager.stop_all()
        tasks = []
        for flow_id in manager.all_flow_ids():
            try:
                tasks.append(manager.get_task(flow_id))
            except KeyError:
                continue
        if tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=5.0,
                )
            except TimeoutError:
                for task in tasks:
                    task.cancel()

    app = FastAPI(title="Bot API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5175"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(control_router)
    app.include_router(status_router)
    app.include_router(config_router)

    @app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app

