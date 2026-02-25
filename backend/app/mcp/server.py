import asyncio
import json
import logging
import urllib.parse
import uuid
from datetime import date, timedelta

import asyncpg
from fastmcp import FastMCP
from googleapiclient.discovery import build as build_google_client

from app.config import settings
from app.exercise_resolver import resolve_exercise_name

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
                      available_days, preferred_unit, training_objective
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
        "training_objective": row["training_objective"],
    }
    logger.info("[get_user_profile] returning: %s", result)
    return result


@mcp.tool()
async def update_training_objective(user_id: str, objective: str) -> dict:
    """Update a user's training objective — a specific, measurable goal like
    'I want to do 10 pullups in 6 months' or 'Bench press 100kg by December'.
    The objective must be 1000 characters or fewer. Pass an empty string to clear it."""
    logger.info("[update_training_objective] user_id=%s, objective_length=%d", user_id, len(objective))
    if len(objective) > 1000:
        return {"error": "Objective must be 1000 characters or fewer."}
    pool = await _get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE profiles SET training_objective = $1, updated_at = NOW() WHERE id = $2",
            objective or None,
            uuid.UUID(user_id),
        )
        if result == "UPDATE 0":
            return {"error": "User not found"}
    logger.info("[update_training_objective] saved for user %s", user_id)
    return {"message": "Training objective updated.", "objective": objective or None}


@mcp.tool()
async def get_exercise_history(
    user_id: str, exercise_name: str, limit: int = 10
) -> dict:
    """Retrieve recent exercise log entries for a specific exercise,
    ordered by most recent first."""
    logger.info("[get_exercise_history] user_id=%s, exercise=%s, limit=%d", user_id, exercise_name, limit)
    pool = await _get_pool()
    async with pool.acquire() as conn:
        resolved = await resolve_exercise_name(conn, exercise_name)
        rows = await conn.fetch(
            """SELECT weight_kg, reps, rpe, logged_at
               FROM exercise_logs
               WHERE user_id = $1 AND exercise_name = $2
               ORDER BY logged_at DESC
               LIMIT $3""",
            uuid.UUID(user_id),
            resolved,
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


def _youtube_search(api_key: str, query: str, max_results: int = 1) -> list[dict]:
    """Synchronous YouTube Data API v3 search (called via run_in_executor)."""
    youtube = build_google_client("youtube", "v3", developerKey=api_key)
    response = (
        youtube.search()
        .list(
            q=f"{query} exercise demonstration form",
            part="snippet",
            type="video",
            maxResults=max_results,
            videoDuration="medium",
            safeSearch="strict",
        )
        .execute()
    )
    return [
        {
            "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            "title": item["snippet"]["title"],
            "thumbnail": item["snippet"]["thumbnails"].get("high", item["snippet"]["thumbnails"]["default"])["url"],
        }
        for item in response.get("items", [])
    ]


@mcp.tool()
async def search_youtube(query: str) -> dict:
    """Search for an exercise demonstration video on YouTube.
    Returns a direct link to a relevant video with title and thumbnail."""
    logger.info("[search_youtube] query=%s", query)

    api_key = settings.YOUTUBE_API_KEY
    if not api_key:
        logger.warning("[search_youtube] YOUTUBE_API_KEY not set, falling back to search URL")
        encoded = urllib.parse.quote_plus(query)
        return {
            "url": f"https://www.youtube.com/results?search_query={encoded}",
            "title": f"{query} - Exercise Demo",
            "thumbnail": "",
        }

    try:
        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(None, _youtube_search, api_key, query)
        if results:
            logger.info("[search_youtube] found video: %s", results[0]["url"])
            return results[0]
        logger.info("[search_youtube] no results from API, falling back to search URL")
    except Exception:
        logger.exception("[search_youtube] YouTube API error, falling back to search URL")

    encoded = urllib.parse.quote_plus(query)
    return {
        "url": f"https://www.youtube.com/results?search_query={encoded}",
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
                # Resolve exercise names to canonical forms
                for exercise in session.get("exercises", []):
                    if exercise.get("name"):
                        exercise["name"] = await resolve_exercise_name(conn, exercise["name"])
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

            # Resolve exercise names to canonical forms
            for exercise in session_data.get("exercises", []):
                if exercise.get("name"):
                    exercise["name"] = await resolve_exercise_name(conn, exercise["name"])

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
    """Update an existing workout session's title, exercises, or scheduled date.
    updates is a JSON string: {"title": "...", "exercises": [...], "scheduled_date": "2026-03-05"}"""
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
            # Resolve exercise names to canonical forms
            for exercise in updates_data["exercises"]:
                if exercise.get("name"):
                    exercise["name"] = await resolve_exercise_name(conn, exercise["name"])
            param_idx += 1
            set_clauses.append(f"exercises = ${param_idx}")
            params.append(json.dumps(updates_data["exercises"]))

        if "scheduled_date" in updates_data:
            param_idx += 1
            set_clauses.append(f"scheduled_date = ${param_idx}")
            params.append(date.fromisoformat(updates_data["scheduled_date"]))

        if not set_clauses:
            return {"error": "No valid fields to update. Provide 'title', 'exercises', and/or 'scheduled_date'."}

        query = f"UPDATE workout_sessions SET {', '.join(set_clauses)} WHERE id = $1"
        await conn.execute(query, sid, *params)

    result = {"session_id": session_id, "message": "Session updated successfully."}
    logger.info("[update_session] done: %s", result)
    return result


@mcp.tool()
async def delete_session(user_id: str, session_id: str) -> dict:
    """Delete a scheduled workout session. Only sessions with status 'scheduled'
    can be deleted — in-progress or completed sessions cannot be removed."""
    logger.info("[delete_session] user_id=%s, session_id=%s", user_id, session_id)
    uid = uuid.UUID(user_id)
    sid = uuid.UUID(session_id)

    pool = await _get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT id, title, scheduled_date, status
               FROM workout_sessions WHERE id = $1 AND user_id = $2""",
            sid, uid,
        )
        if not row:
            return {"error": "Session not found or does not belong to user"}

        if row["status"] != "scheduled":
            return {"error": f"Cannot delete a session with status '{row['status']}'. Only scheduled sessions can be deleted."}

        async with conn.transaction():
            await conn.execute(
                "DELETE FROM exercise_logs WHERE session_id = $1", sid
            )
            await conn.execute(
                "DELETE FROM workout_sessions WHERE id = $1", sid
            )

    result = {
        "deleted_session_id": session_id,
        "title": row["title"],
        "scheduled_date": row["scheduled_date"].isoformat(),
        "message": f"Session '{row['title']}' on {row['scheduled_date'].isoformat()} has been deleted.",
    }
    logger.info("[delete_session] done: %s", result)
    return result


@mcp.tool()
async def search_exercises(query: str, limit: int = 10) -> dict:
    """Search the exercise database by name. Returns matching exercises
    with their canonical names, muscle groups, and categories.
    Use this to find the correct canonical name for an exercise."""
    logger.info("[search_exercises] query=%s, limit=%d", query, limit)
    pool = await _get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT name, muscle_group, category, equipment,
                      similarity(name, $1) AS sim
               FROM exercises
               WHERE similarity(name, $1) >= 0.1
               ORDER BY sim DESC
               LIMIT $2""",
            query,
            limit,
        )
    if not rows:
        return {"matches": [], "note": f"No exercises found matching '{query}'."}
    return {
        "matches": [
            {
                "name": r["name"],
                "muscle_group": r["muscle_group"],
                "category": r["category"],
                "equipment": r["equipment"],
                "similarity": round(float(r["sim"]), 2),
            }
            for r in rows
        ]
    }


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8080)
