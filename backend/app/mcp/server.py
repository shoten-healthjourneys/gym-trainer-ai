import json
import logging
import uuid
from datetime import date, timedelta

import asyncpg
from fastmcp import FastMCP

from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("mcp.tools")

mcp = FastMCP(name="gym-tools")

_pool: asyncpg.Pool | None = None

_DAY_OFFSETS: dict[str, int] = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


async def _get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL)
    return _pool


@mcp.tool()
async def get_user_profile(user_id: str) -> dict:
    """Retrieve a user's profile including training goals, experience level,
    available days, preferred unit, and display name."""
    logger.info("[get_user_profile] called with user_id=%s", user_id)
    pool = await _get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT display_name, training_goals, experience_level,
                      available_days, preferred_unit
               FROM profiles WHERE id = $1""",
            uuid.UUID(user_id),
        )
    if not row:
        logger.warning("[get_user_profile] user NOT found: %s", user_id)
        return {"error": "User not found"}
    result = {
        "display_name": row["display_name"],
        "training_goals": row["training_goals"],
        "experience_level": row["experience_level"],
        "available_days": row["available_days"],
        "preferred_unit": row["preferred_unit"],
    }
    logger.info("[get_user_profile] returning: %s", result)
    return result


@mcp.tool()
async def get_exercise_history(
    user_id: str, exercise_name: str, limit: int = 10
) -> dict:
    """Retrieve recent exercise log entries for a specific exercise,
    ordered by most recent first."""
    logger.info("[get_exercise_history] user_id=%s, exercise=%s, limit=%d", user_id, exercise_name, limit)
    pool = await _get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT weight_kg, reps, rpe, logged_at
               FROM exercise_logs
               WHERE user_id = $1 AND exercise_name = $2
               ORDER BY logged_at DESC
               LIMIT $3""",
            uuid.UUID(user_id),
            exercise_name,
            limit,
        )
    if not rows:
        logger.info("[get_exercise_history] no history found for %s", exercise_name)
        return {"entries": [], "note": "No history found for this exercise. User has not logged this exercise before — suggest starting weights based on their experience level."}
    logger.info("[get_exercise_history] returning %d entries", len(rows))
    return {
        "entries": [
            {
                "weight_kg": float(r["weight_kg"]) if r["weight_kg"] else None,
                "reps": r["reps"],
                "rpe": float(r["rpe"]) if r["rpe"] else None,
                "logged_at": r["logged_at"].isoformat(),
            }
            for r in rows
        ]
    }


@mcp.tool()
async def search_youtube(query: str) -> dict:
    """Search for an exercise demonstration video on YouTube.
    Currently returns a direct search URL (stub implementation)."""
    logger.info("[search_youtube] query=%s", query)
    return {
        "url": f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}",
        "title": f"{query} - Exercise Demo",
        "thumbnail": "",
    }


@mcp.tool()
async def get_planned_workouts(
    user_id: str, start_date: str, end_date: str
) -> dict:
    """Retrieve planned workout sessions for a user within a date range.
    start_date and end_date are ISO format dates (e.g. '2026-02-23').
    Returns sessions with their exercises, scheduled dates, titles, and status."""
    logger.info("[get_planned_workouts] user_id=%s, start=%s, end=%s", user_id, start_date, end_date)
    pool = await _get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT s.id, s.scheduled_date, s.title, s.status, s.exercises,
                      p.week_start
               FROM workout_sessions s
               LEFT JOIN workout_plans p ON s.plan_id = p.id
               WHERE s.user_id = $1
                 AND s.scheduled_date BETWEEN $2 AND $3
               ORDER BY s.scheduled_date""",
            uuid.UUID(user_id),
            date.fromisoformat(start_date),
            date.fromisoformat(end_date),
        )
    if not rows:
        logger.info("[get_planned_workouts] no sessions found")
        return {"sessions": [], "note": "No workout sessions planned for this date range."}
    sessions = [
        {
            "id": str(r["id"]),
            "scheduled_date": r["scheduled_date"].isoformat(),
            "title": r["title"],
            "status": r["status"],
            "exercises": json.loads(r["exercises"]) if isinstance(r["exercises"], str) else r["exercises"],
            "week_start": r["week_start"].isoformat(),
        }
        for r in rows
    ]
    logger.info("[get_planned_workouts] returning %d sessions", len(sessions))
    return {"sessions": sessions}


@mcp.tool()
async def save_workout_plan(user_id: str, week_start: str, plan: str) -> dict:
    """Save a workout plan and create individual workout sessions.
    The plan parameter must be a JSON string with a 'sessions' array.
    Each session has a 'day' (e.g. 'Monday'), 'title', and 'exercises' list."""
    logger.info("[save_workout_plan] user_id=%s, week_start=%s, plan_length=%d", user_id, week_start, len(plan))
    plan_data = json.loads(plan)
    logger.info("[save_workout_plan] parsed %d sessions", len(plan_data.get("sessions", [])))
    start = date.fromisoformat(week_start)
    uid = uuid.UUID(user_id)
    plan_id = uuid.uuid4()

    pool = await _get_pool()
    sessions_created = 0

    async with pool.acquire() as conn:
        async with conn.transaction():
            # Remove any existing plan + sessions for this week to avoid duplicates
            week_end = start + timedelta(days=6)
            existing_plan_ids = await conn.fetch(
                "SELECT id FROM workout_plans WHERE user_id = $1 AND week_start = $2",
                uid, start,
            )
            for row in existing_plan_ids:
                await conn.execute(
                    "DELETE FROM workout_sessions WHERE plan_id = $1", row["id"]
                )
                await conn.execute(
                    "DELETE FROM workout_plans WHERE id = $1", row["id"]
                )

            await conn.execute(
                """INSERT INTO workout_plans (id, user_id, week_start, plan_json)
                   VALUES ($1, $2, $3, $4)""",
                plan_id,
                uid,
                start,
                json.dumps(plan_data),
            )

            for session in plan_data.get("sessions", []):
                day_name = session.get("day", "").lower()
                offset = _DAY_OFFSETS.get(day_name)
                if offset is None:
                    continue
                scheduled = start + timedelta(days=offset)
                session_id = uuid.uuid4()
                await conn.execute(
                    """INSERT INTO workout_sessions
                       (id, user_id, plan_id, scheduled_date, title, exercises)
                       VALUES ($1, $2, $3, $4, $5, $6)""",
                    session_id,
                    uid,
                    plan_id,
                    scheduled,
                    session.get("title", "Workout"),
                    json.dumps(session.get("exercises", [])),
                )
                sessions_created += 1

    result = {
        "plan_id": str(plan_id),
        "sessions_created": sessions_created,
        "message": f"Plan saved with {sessions_created} sessions starting {week_start}.",
    }
    logger.info("[save_workout_plan] done: %s", result)
    return result


@mcp.tool()
async def add_session_to_week(user_id: str, week_start: str, session: str) -> dict:
    """Add a single workout session to an existing week without modifying other sessions.
    session is a JSON string: {"day": "Tuesday", "title": "Leg Day", "exercises": [...]}
    If a session already exists on that day, it will be replaced."""
    logger.info("[add_session_to_week] user_id=%s, week_start=%s", user_id, week_start)
    session_data = json.loads(session)
    start = date.fromisoformat(week_start)
    uid = uuid.UUID(user_id)

    day_name = session_data.get("day", "").lower()
    offset = _DAY_OFFSETS.get(day_name)
    if offset is None:
        return {"error": f"Invalid day: {session_data.get('day')}"}
    scheduled = start + timedelta(days=offset)

    pool = await _get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Find or create a plan for this week
            plan_row = await conn.fetchrow(
                "SELECT id FROM workout_plans WHERE user_id = $1 AND week_start = $2",
                uid, start,
            )
            if plan_row:
                plan_id = plan_row["id"]
            else:
                plan_id = uuid.uuid4()
                await conn.execute(
                    """INSERT INTO workout_plans (id, user_id, week_start, plan_json)
                       VALUES ($1, $2, $3, $4)""",
                    plan_id, uid, start, json.dumps({"sessions": []}),
                )

            # Delete any existing session on that day for this user in this week
            await conn.execute(
                """DELETE FROM workout_sessions
                   WHERE user_id = $1 AND scheduled_date = $2 AND plan_id = $3""",
                uid, scheduled, plan_id,
            )

            session_id = uuid.uuid4()
            await conn.execute(
                """INSERT INTO workout_sessions
                   (id, user_id, plan_id, scheduled_date, title, exercises)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                session_id, uid, plan_id, scheduled,
                session_data.get("title", "Workout"),
                json.dumps(session_data.get("exercises", [])),
            )

    result = {
        "session_id": str(session_id),
        "scheduled_date": scheduled.isoformat(),
        "message": f"Session added for {session_data.get('day')} ({scheduled.isoformat()}).",
    }
    logger.info("[add_session_to_week] done: %s", result)
    return result


@mcp.tool()
async def update_session(user_id: str, session_id: str, updates: str) -> dict:
    """Update an existing workout session's title or exercises.
    updates is a JSON string: {"title": "...", "exercises": [...]}"""
    logger.info("[update_session] user_id=%s, session_id=%s", user_id, session_id)
    updates_data = json.loads(updates)
    uid = uuid.UUID(user_id)
    sid = uuid.UUID(session_id)

    pool = await _get_pool()
    async with pool.acquire() as conn:
        # Verify session belongs to user
        row = await conn.fetchrow(
            "SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2",
            sid, uid,
        )
        if not row:
            return {"error": "Session not found or does not belong to user"}

        set_clauses = []
        params: list = []
        param_idx = 1

        if "title" in updates_data:
            param_idx += 1
            set_clauses.append(f"title = ${param_idx}")
            params.append(updates_data["title"])

        if "exercises" in updates_data:
            param_idx += 1
            set_clauses.append(f"exercises = ${param_idx}")
            params.append(json.dumps(updates_data["exercises"]))

        if not set_clauses:
            return {"error": "No valid fields to update. Provide 'title' and/or 'exercises'."}

        query = f"UPDATE workout_sessions SET {', '.join(set_clauses)} WHERE id = $1"
        await conn.execute(query, sid, *params)

    result = {"session_id": session_id, "message": "Session updated successfully."}
    logger.info("[update_session] done: %s", result)
    return result


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8080)
