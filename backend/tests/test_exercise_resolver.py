import pytest
from unittest.mock import AsyncMock
from app.exercise_resolver import resolve_exercise_name, _extract_muscle_group

pytestmark = pytest.mark.anyio


async def test_exact_match():
    conn = AsyncMock()
    conn.fetchrow.return_value = {"name": "Barbell Bench Press"}
    result = await resolve_exercise_name(conn, "barbell bench press")
    assert result == "Barbell Bench Press"
    conn.fetchrow.assert_called_once()


async def test_alias_match():
    conn = AsyncMock()
    conn.fetchrow.side_effect = [None, {"name": "Barbell Bench Press"}]
    result = await resolve_exercise_name(conn, "bench")
    assert result == "Barbell Bench Press"


async def test_trigram_match():
    conn = AsyncMock()
    conn.fetchrow.side_effect = [None, None, {"name": "Barbell Bench Press", "sim": 0.55}]
    result = await resolve_exercise_name(conn, "barbell benchpress")
    assert result == "Barbell Bench Press"


async def test_trigram_match_with_muscle_hint_prefers_correct_group():
    """When input contains 'shoulder', prefer the shoulders exercise over chest."""
    conn = AsyncMock()
    # Exact match: None, Alias match: None
    conn.fetchrow.side_effect = [None, None]
    # Trigram fetch returns multiple candidates (chest press has higher raw sim)
    conn.fetch.return_value = [
        {"name": "Machine Chest Press", "muscle_group": "chest", "sim": 0.45},
        {"name": "Machine Shoulder Press", "muscle_group": "shoulders", "sim": 0.40},
    ]
    result = await resolve_exercise_name(conn, "shoulder press machine")
    assert result == "Machine Shoulder Press"


async def test_trigram_match_with_muscle_hint_no_candidates():
    """When muscle hint is present but no candidates pass threshold, auto-insert."""
    conn = AsyncMock()
    conn.fetchrow.side_effect = [None, None]
    conn.fetch.return_value = []
    conn.execute = AsyncMock()
    result = await resolve_exercise_name(conn, "shoulder something weird")
    assert result == "shoulder something weird"
    conn.execute.assert_called_once()


async def test_trigram_no_muscle_hint_picks_best_sim():
    """Without muscle keywords, standard trigram picks highest similarity."""
    conn = AsyncMock()
    conn.fetchrow.side_effect = [None, None, {"name": "Barbell Row", "sim": 0.50}]
    result = await resolve_exercise_name(conn, "barbell rows")
    assert result == "Barbell Row"


async def test_no_match_auto_insert():
    conn = AsyncMock()
    conn.fetchrow.side_effect = [None, None, None]
    conn.execute = AsyncMock()
    result = await resolve_exercise_name(conn, "My Custom Exercise")
    assert result == "My Custom Exercise"
    conn.execute.assert_called_once()


async def test_empty_input():
    conn = AsyncMock()
    result = await resolve_exercise_name(conn, "")
    assert result == ""
    conn.fetchrow.assert_not_called()


async def test_whitespace_only():
    conn = AsyncMock()
    result = await resolve_exercise_name(conn, "   ")
    assert result == "   "
    conn.fetchrow.assert_not_called()


# Unit tests for _extract_muscle_group
def test_extract_muscle_group_shoulder():
    assert _extract_muscle_group("shoulder press machine") == "shoulders"


def test_extract_muscle_group_chest():
    assert _extract_muscle_group("chest fly") == "chest"


def test_extract_muscle_group_back():
    assert _extract_muscle_group("lat pulldown") == "back"


def test_extract_muscle_group_legs():
    assert _extract_muscle_group("leg press") == "legs"


def test_extract_muscle_group_arms():
    assert _extract_muscle_group("bicep curl") == "arms"


def test_extract_muscle_group_none():
    assert _extract_muscle_group("bench press") is None


def test_extract_muscle_group_delt():
    assert _extract_muscle_group("rear delt fly") == "shoulders"
