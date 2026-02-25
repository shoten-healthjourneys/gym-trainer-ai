import pytest
from datetime import date

pytestmark = pytest.mark.anyio

EXERCISE_NAME = "Barbell Bench Press"


async def test_list_exercise_names(client, mock_conn):
    mock_conn.fetch.return_value = [
        {"exercise_name": "Barbell Bench Press"},
        {"exercise_name": "Barbell Squat"},
    ]
    resp = await client.get("/api/exercises/names")
    assert resp.status_code == 200
    data = resp.json()
    assert data == ["Barbell Bench Press", "Barbell Squat"]


async def test_list_exercise_names_empty(client, mock_conn):
    mock_conn.fetch.return_value = []
    resp = await client.get("/api/exercises/names")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_exercise_history(client, mock_conn):
    # Mock resolver: fetchrow returns exact match
    mock_conn.fetchrow.return_value = {"name": EXERCISE_NAME}
    # Mock history query
    mock_conn.fetch.return_value = [
        {"session_date": date(2026, 1, 5), "max_weight": 70.0, "best_reps": 10, "total_sets": 4},
        {"session_date": date(2026, 1, 12), "max_weight": 72.5, "best_reps": 8, "total_sets": 3},
    ]
    resp = await client.get("/api/exercises/history", params={"exercise_name": "bench press", "days": 90})
    assert resp.status_code == 200
    data = resp.json()
    assert data["exerciseName"] == EXERCISE_NAME
    assert len(data["dataPoints"]) == 2
    assert data["dataPoints"][0]["maxWeight"] == 70.0
    assert data["dataPoints"][0]["date"] == "2026-01-05"


async def test_exercise_history_detail(client, mock_conn):
    mock_conn.fetchrow.return_value = {"name": EXERCISE_NAME}
    mock_conn.fetch.return_value = [
        {"session_date": date(2026, 1, 12), "set_number": 1, "weight_kg": 72.5, "reps": 10, "rpe": 7.0},
        {"session_date": date(2026, 1, 12), "set_number": 2, "weight_kg": 72.5, "reps": 8, "rpe": 8.0},
        {"session_date": date(2026, 1, 19), "set_number": 1, "weight_kg": 75.0, "reps": 8, "rpe": 8.5},
    ]
    resp = await client.get("/api/exercises/history/detail", params={"exercise_name": "bench press"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2  # 2 dates
    assert data[0]["date"] == "2026-01-12"
    assert len(data[0]["sets"]) == 2
    assert data[1]["date"] == "2026-01-19"
    assert len(data[1]["sets"]) == 1
    assert data[0]["sets"][0]["weightKg"] == 72.5
