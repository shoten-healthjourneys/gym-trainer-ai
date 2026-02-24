import uuid
from datetime import date, datetime, timezone
import pytest
from httpx import AsyncClient

TEST_SESSION_ID = "11111111-1111-1111-1111-111111111111"
TEST_USER_ID = "00000000-0000-0000-0000-000000000099"


def _make_session_row(status="scheduled", started_at=None, completed_at=None):
    return {
        "id": uuid.UUID(TEST_SESSION_ID),
        "user_id": uuid.UUID(TEST_USER_ID),
        "plan_id": None,
        "scheduled_date": date.today(),
        "title": "Upper Body",
        "status": status,
        "exercises": "[]",
        "started_at": started_at,
        "completed_at": completed_at,
        "created_at": datetime.now(timezone.utc),
    }


@pytest.mark.asyncio
async def test_start_session(client: AsyncClient, mock_conn):
    now = datetime.now(timezone.utc)
    mock_conn.fetchrow.side_effect = [
        _make_session_row(status="scheduled"),
        _make_session_row(status="in_progress", started_at=now),
    ]
    mock_conn.execute.return_value = "UPDATE 1"

    resp = await client.post(f"/api/sessions/{TEST_SESSION_ID}/start")
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"
    assert resp.json()["startedAt"] is not None


@pytest.mark.asyncio
async def test_complete_session(client: AsyncClient, mock_conn):
    now = datetime.now(timezone.utc)
    mock_conn.fetchrow.side_effect = [
        _make_session_row(status="in_progress", started_at=now),
        _make_session_row(status="completed", started_at=now, completed_at=now),
    ]
    mock_conn.execute.return_value = "UPDATE 1"

    resp = await client.post(f"/api/sessions/{TEST_SESSION_ID}/complete")
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_cannot_start_in_progress_session(client: AsyncClient, mock_conn):
    now = datetime.now(timezone.utc)
    mock_conn.fetchrow.return_value = _make_session_row(status="in_progress", started_at=now)

    resp = await client.post(f"/api/sessions/{TEST_SESSION_ID}/start")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_cannot_complete_scheduled_session(client: AsyncClient, mock_conn):
    mock_conn.fetchrow.return_value = _make_session_row(status="scheduled")

    resp = await client.post(f"/api/sessions/{TEST_SESSION_ID}/complete")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_start_nonexistent_session(client: AsyncClient, mock_conn):
    mock_conn.fetchrow.return_value = None
    resp = await client.post(f"/api/sessions/{TEST_SESSION_ID}/start")
    assert resp.status_code == 404
