from typing import AsyncGenerator

import asyncpg
from fastapi import Request


def get_pool(request: Request) -> asyncpg.Pool:
    return request.app.state.pool


async def get_db(request: Request) -> AsyncGenerator[asyncpg.Connection, None]:
    pool: asyncpg.Pool = request.app.state.pool
    async with pool.acquire() as conn:
        yield conn


async def fetch_one(
    conn: asyncpg.Connection, query: str, *args: object
) -> dict | None:
    row = await conn.fetchrow(query, *args)
    return dict(row) if row else None


async def fetch_all(
    conn: asyncpg.Connection, query: str, *args: object
) -> list[dict]:
    rows = await conn.fetch(query, *args)
    return [dict(r) for r in rows]


async def execute(
    conn: asyncpg.Connection, query: str, *args: object
) -> str:
    return await conn.execute(query, *args)
