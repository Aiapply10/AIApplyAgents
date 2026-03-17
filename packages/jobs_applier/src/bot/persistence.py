"""SQLite persistence for resumable flow context snapshots."""

import json
from typing import Any

import aiosqlite

from bot.context import FlowContext

DB_FILE = "bot_state.db"


async def init_db() -> None:
    """Create required persistence tables when missing."""
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS flow_contexts (
                flow_id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        await db.commit()


async def persist(ctx: FlowContext) -> None:
    """Upsert a serialized flow context snapshot."""
    payload: dict[str, Any] = ctx.serializable()
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            """
            INSERT INTO flow_contexts(flow_id, data, updated_at)
            VALUES(?, ?, ?)
            ON CONFLICT(flow_id) DO UPDATE SET
                data=excluded.data,
                updated_at=excluded.updated_at
            """,
            (ctx.flow_id, json.dumps(payload), payload["updated_at"]),
        )
        await db.commit()


async def load_context(flow_id: str) -> FlowContext | None:
    """Load a context by flow id or return None if absent."""
    async with aiosqlite.connect(DB_FILE) as db:
        cursor = await db.execute(
            "SELECT data FROM flow_contexts WHERE flow_id = ?",
            (flow_id,),
        )
        row = await cursor.fetchone()
        await cursor.close()

    if row is None:
        return None
    data = json.loads(row[0])
    return FlowContext.from_dict(data)

