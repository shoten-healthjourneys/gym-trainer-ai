import json
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.db import get_db, fetch_one, fetch_all, execute

router = APIRouter(prefix="/api", tags=["sessions"])


def _to_camel(row: dict) -> dict:
    """Convert a workout_sessions DB row to camelCase JSON."""
    exercises = row.get("exercises")
    if isinstance(exercises, str):
        exercises = json.loads(exercises)

    # Normalise exercise keys to camelCase
    camel_exercises = []
    if exercises:
        for ex in exercises:
            camel_exercises.append({
                "name": ex.get("name", ""),
                "sets": ex.get("sets", 0),
                "reps": ex.get("reps", 0),
                "youtubeUrl": ex.get("youtube_url", ex.get("youtubeUrl", "")),
                "notes": ex.get("notes", ""),
            })

    return {
        "id": str(row["id"]),
        "userId": str(row["user_id"]),
        "planId": str(row["plan_id"]) if row.get("plan_id") else None,
        "scheduledDate": row["scheduled_date"].isoformat() if row.get("scheduled_date") else None,
        "title": row.get("title", ""),
        "status": row.get("status", "scheduled"),
        "exercises": camel_exercises,
        "startedAt": row["started_at"].isoformat() if row.get("started_at") else None,
        "completedAt": row["completed_at"].isoformat() if row.get("completed_at") else None,
        "createdAt": row["created_at"].isoformat() if row.get("created_at") else None,
    }


@router.get("/sessions")
async def list_sessions(
    week_start: date = Query(..., description="Monday of the target week (YYYY-MM-DD)"),
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Return all workout sessions for a given week (7 days from week_start)."""
    user_id = uuid.UUID(user["user_id"])
    week_end = week_start + timedelta(days=6)

    rows = await fetch_all(
        conn,
        """SELECT id, user_id, plan_id, scheduled_date, title, status,
                  exercises, started_at, completed_at, created_at
           FROM workout_sessions
           WHERE user_id = $1 AND scheduled_date BETWEEN $2 AND $3
           ORDER BY scheduled_date""",
        user_id,
        week_start,
        week_end,
    )
    return [_to_camel(r) for r in rows]


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: uuid.UUID,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Return a single workout session by ID."""
    user_id = uuid.UUID(user["user_id"])

    row = await fetch_one(
        conn,
        """SELECT id, user_id, plan_id, scheduled_date, title, status,
                  exercises, started_at, completed_at, created_at
           FROM workout_sessions
           WHERE id = $1 AND user_id = $2""",
        session_id,
        user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return _to_camel(row)


@router.post("/sessions/{session_id}/start")
async def start_session(
    session_id: uuid.UUID,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = uuid.UUID(user["user_id"])
    row = await fetch_one(
        conn,
        "SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2",
        session_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row["status"] != "scheduled":
        raise HTTPException(status_code=400, detail=f"Cannot start session with status '{row['status']}'")

    await execute(
        conn,
        "UPDATE workout_sessions SET status = 'in_progress', started_at = NOW() WHERE id = $1",
        session_id,
    )
    updated = await fetch_one(
        conn,
        """SELECT id, user_id, plan_id, scheduled_date, title, status,
                  exercises, started_at, completed_at, created_at
           FROM workout_sessions WHERE id = $1""",
        session_id,
    )
    return _to_camel(updated)


@router.post("/sessions/{session_id}/complete")
async def complete_session(
    session_id: uuid.UUID,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = uuid.UUID(user["user_id"])
    row = await fetch_one(
        conn,
        "SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2",
        session_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row["status"] != "in_progress":
        raise HTTPException(status_code=400, detail=f"Cannot complete session with status '{row['status']}'")

    await execute(
        conn,
        "UPDATE workout_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1",
        session_id,
    )
    updated = await fetch_one(
        conn,
        """SELECT id, user_id, plan_id, scheduled_date, title, status,
                  exercises, started_at, completed_at, created_at
           FROM workout_sessions WHERE id = $1""",
        session_id,
    )
    return _to_camel(updated)
