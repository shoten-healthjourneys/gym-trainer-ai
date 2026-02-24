import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient

TEST_SESSION_ID = "11111111-1111-1111-1111-111111111111"
TEST_USER_ID = "00000000-0000-0000-0000-000000000099"


@pytest.mark.asyncio
async def test_create_exercise_log(client: AsyncClient, mock_conn):
    log_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # Mock session validation
    mock_conn.fetchrow.side_effect = [
        # _validate_session
        {"id": uuid.UUID(TEST_SESSION_ID), "user_id": uuid.UUID(TEST_USER_ID), "status": "in_progress"},
        # set_number query
        {"next_set": 1},
        # fetch created log
        {
            "id": log_id, "user_id": uuid.UUID(TEST_USER_ID),
            "session_id": uuid.UUID(TEST_SESSION_ID), "exercise_name": "Barbell Bench Press",
            "set_number": 1, "weight_kg": 80.0, "reps": 8, "rpe": None, "notes": None,
            "logged_at": now,
        },
    ]
    mock_conn.execute.return_value = "INSERT 0 1"

    resp = await client.post("/api/exercises/log", json={
        "sessionId": TEST_SESSION_ID,
        "exerciseName": "Barbell Bench Press",
        "weightKg": 80.0,
        "reps": 8,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["exerciseName"] == "Barbell Bench Press"
    assert data["setNumber"] == 1
    assert data["weightKg"] == 80.0
    assert data["reps"] == 8


@pytest.mark.asyncio
async def test_list_exercise_logs(client: AsyncClient, mock_conn):
    now = datetime.now(timezone.utc)
    log_id = uuid.uuid4()

    mock_conn.fetchrow.return_value = {
        "id": uuid.UUID(TEST_SESSION_ID), "user_id": uuid.UUID(TEST_USER_ID), "status": "in_progress",
    }
    mock_conn.fetch.return_value = [
        {
            "id": log_id, "user_id": uuid.UUID(TEST_USER_ID),
            "session_id": uuid.UUID(TEST_SESSION_ID), "exercise_name": "Squat",
            "set_number": 1, "weight_kg": 100.0, "reps": 5, "rpe": 7.0, "notes": None,
            "logged_at": now,
        },
    ]

    resp = await client.get(f"/api/exercises/log?session_id={TEST_SESSION_ID}&exercise_name=Squat")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["exerciseName"] == "Squat"


@pytest.mark.asyncio
async def test_update_exercise_log(client: AsyncClient, mock_conn):
    log_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    mock_conn.fetchrow.side_effect = [
        # existing check
        {"id": log_id, "user_id": uuid.UUID(TEST_USER_ID), "session_id": uuid.UUID(TEST_SESSION_ID),
         "exercise_name": "Squat", "set_number": 1, "weight_kg": 100.0, "reps": 5, "rpe": None, "notes": None, "logged_at": now},
        # fetch updated
        {"id": log_id, "user_id": uuid.UUID(TEST_USER_ID), "session_id": uuid.UUID(TEST_SESSION_ID),
         "exercise_name": "Squat", "set_number": 1, "weight_kg": 105.0, "reps": 5, "rpe": 8.0, "notes": None, "logged_at": now},
    ]
    mock_conn.execute.return_value = "UPDATE 1"

    resp = await client.patch(f"/api/exercises/log/{log_id}", json={"weightKg": 105.0, "rpe": 8.0})
    assert resp.status_code == 200
    assert resp.json()["weightKg"] == 105.0
    assert resp.json()["rpe"] == 8.0


@pytest.mark.asyncio
async def test_delete_exercise_log(client: AsyncClient, mock_conn):
    log_id = uuid.uuid4()
    mock_conn.fetchrow.return_value = {"id": log_id}
    mock_conn.execute.return_value = "DELETE 1"

    resp = await client.delete(f"/api/exercises/log/{log_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_create_log_wrong_session(client: AsyncClient, mock_conn):
    mock_conn.fetchrow.return_value = None  # session not found

    resp = await client.post("/api/exercises/log", json={
        "sessionId": TEST_SESSION_ID,
        "exerciseName": "Squat",
        "weightKg": 100,
        "reps": 5,
    })
    assert resp.status_code == 404
