from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_USER

pytestmark = pytest.mark.asyncio(loop_scope="function")


# ---------------------------------------------------------------------------
# Sample DB row matching what SELECT * FROM profiles would return
# ---------------------------------------------------------------------------
def _make_profile_row(overrides: dict | None = None) -> dict:
    row = {
        "id": TEST_USER["user_id"],
        "display_name": TEST_USER["display_name"],
        "email": TEST_USER["email"],
        "training_goals": ["hypertrophy", "strength"],
        "experience_level": "intermediate",
        "available_days": 4,
        "preferred_unit": "kg",
        "created_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
        "updated_at": datetime(2025, 6, 15, tzinfo=timezone.utc),
    }
    if overrides:
        row.update(overrides)
    return row


# ---- 1. Health check -------------------------------------------------------

async def test_health_returns_ok(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---- 2. Unauthenticated access returns 403 ---------------------------------

async def test_get_profile_without_auth_returns_401(
    unauthed_client: AsyncClient,
) -> None:
    resp = await unauthed_client.get("/api/profile")
    assert resp.status_code == 401


# ---- 3. GET /api/profile with auth — success --------------------------------

async def test_get_profile_success(
    client: AsyncClient, mock_conn: AsyncMock
) -> None:
    row = _make_profile_row()

    with patch("app.routes.profile.fetch_one", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = row
        resp = await client.get("/api/profile")

    assert resp.status_code == 200
    data = resp.json()

    # Verify camelCase field names
    assert data["id"] == TEST_USER["user_id"]
    assert data["displayName"] == TEST_USER["display_name"]
    assert data["email"] == TEST_USER["email"]
    assert data["trainingGoals"] == ["hypertrophy", "strength"]
    assert data["experienceLevel"] == "intermediate"
    assert data["availableDays"] == 4
    assert data["preferredUnit"] == "kg"
    assert "createdAt" in data
    assert "updatedAt" in data


# ---- 4. GET /api/profile when user not found — 404 -------------------------

async def test_get_profile_not_found(
    client: AsyncClient, mock_conn: AsyncMock
) -> None:
    with patch("app.routes.profile.fetch_one", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = None
        resp = await client.get("/api/profile")

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Profile not found"


# ---- 5. PUT /api/profile with valid data — success -------------------------

async def test_update_profile_success(
    client: AsyncClient, mock_conn: AsyncMock
) -> None:
    updated_row = _make_profile_row(
        {"experience_level": "advanced", "available_days": 5}
    )

    with (
        patch("app.routes.profile.execute", new_callable=AsyncMock) as mock_exec,
        patch("app.routes.profile.fetch_one", new_callable=AsyncMock) as mock_fetch,
    ):
        mock_exec.return_value = "UPDATE 1"
        mock_fetch.return_value = updated_row

        resp = await client.put(
            "/api/profile",
            json={
                "experienceLevel": "advanced",
                "availableDays": 5,
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["experienceLevel"] == "advanced"
    assert data["availableDays"] == 5

    # Verify execute was called (the UPDATE query)
    mock_exec.assert_awaited_once()
    call_args = mock_exec.call_args
    assert "UPDATE profiles SET" in call_args[0][1]


# ---- 6. PUT /api/profile with partial data — only updates provided fields ---

async def test_update_profile_partial(
    client: AsyncClient, mock_conn: AsyncMock
) -> None:
    updated_row = _make_profile_row({"preferred_unit": "lbs"})

    with (
        patch("app.routes.profile.execute", new_callable=AsyncMock) as mock_exec,
        patch("app.routes.profile.fetch_one", new_callable=AsyncMock) as mock_fetch,
    ):
        mock_exec.return_value = "UPDATE 1"
        mock_fetch.return_value = updated_row

        resp = await client.put(
            "/api/profile",
            json={"preferredUnit": "lbs"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["preferredUnit"] == "lbs"

    # Verify that only preferred_unit was in the SET clause (plus updated_at)
    call_args = mock_exec.call_args
    query = call_args[0][1]
    assert "preferred_unit" in query
    # Should NOT contain other fields
    assert "training_goals" not in query
    assert "experience_level" not in query
    assert "available_days" not in query


# ---- 7. PUT /api/profile with empty body — 400 or 422 ----------------------

async def test_update_profile_no_fields_returns_400(
    client: AsyncClient, mock_conn: AsyncMock
) -> None:
    resp = await client.put("/api/profile", json={})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No fields to update"
