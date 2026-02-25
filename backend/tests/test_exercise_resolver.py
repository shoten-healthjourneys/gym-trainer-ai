import pytest
from unittest.mock import AsyncMock
from app.exercise_resolver import resolve_exercise_name

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
