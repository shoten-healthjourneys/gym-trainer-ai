import os

# Set dummy env vars BEFORE any app imports (Settings validates on import)
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("CIAM_TENANT_NAME", "testtenant")
os.environ.setdefault("CIAM_CLIENT_ID", "test-client-id")

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.auth import get_current_user
from app.db import get_db
from app.routes.profile import router as profile_router

TEST_USER = {
    "user_id": "00000000-0000-0000-0000-000000000099",
    "email": "test@example.com",
    "display_name": "Test User",
}


@pytest.fixture
def mock_conn() -> AsyncMock:
    """A mock asyncpg connection."""
    return AsyncMock()


@pytest.fixture
def app(mock_conn: AsyncMock) -> FastAPI:
    """Create a FastAPI test app with overridden dependencies."""

    @asynccontextmanager
    async def _noop_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        yield

    test_app = FastAPI(lifespan=_noop_lifespan)
    test_app.include_router(profile_router)

    # Health endpoint lives on the root app, replicate it
    @test_app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    async def _override_db() -> AsyncGenerator[AsyncMock, None]:
        yield mock_conn

    test_app.dependency_overrides[get_db] = _override_db
    test_app.dependency_overrides[get_current_user] = lambda: TEST_USER

    return test_app


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def unauthed_app(mock_conn: AsyncMock) -> FastAPI:
    """App WITHOUT auth override — requests should fail auth."""

    @asynccontextmanager
    async def _noop_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        yield

    test_app = FastAPI(lifespan=_noop_lifespan)
    test_app.include_router(profile_router)

    # Still override DB so we don't need a real pool
    async def _override_db() -> AsyncGenerator[AsyncMock, None]:
        yield mock_conn

    test_app.dependency_overrides[get_db] = _override_db
    # Deliberately NOT overriding get_current_user

    return test_app


@pytest.fixture
async def unauthed_client(unauthed_app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=unauthed_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
