import json
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.db import get_db, fetch_one, fetch_all, execute

router = APIRouter(prefix="/api", tags=["sessions"])


def _exercise_to_camel(ex: dict) -> dict:
    """Convert a single exercise dict to camelCase."""
    result = {
        "name": ex.get("name", ""),
        "sets": ex.get("sets", 0),
        "reps": ex.get("reps", 0),
        "youtubeUrl": ex.get("youtube_url", ex.get("youtubeUrl", "")),
        "notes": ex.get("notes", ""),
    }
    exercise_type = ex.get("exerciseType") or ex.get("exercise_type")
    if exercise_type:
        result["exerciseType"] = exercise_type
    target_rpe = ex.get("targetRpe") or ex.get("target_rpe")
    if target_rpe:
        result["targetRpe"] = target_rpe
    return result


def _timer_config_to_camel(tc: dict) -> dict:
    """Convert a timer_config dict from snake_case to camelCase."""
    return {
        "mode": tc.get("mode", "standard"),
        **({"restSeconds": tc["rest_seconds"]} if "rest_seconds" in tc else {}),
        **({"restSeconds": tc["restSeconds"]} if "restSeconds" in tc else {}),
        **({"warmupRestSeconds": tc["warmup_rest_seconds"]} if "warmup_rest_seconds" in tc else {}),
        **({"warmupRestSeconds": tc["warmupRestSeconds"]} if "warmupRestSeconds" in tc else {}),
        **({"intervalSeconds": tc["interval_seconds"]} if "interval_seconds" in tc else {}),
        **({"intervalSeconds": tc["intervalSeconds"]} if "intervalSeconds" in tc else {}),
        **({"totalRounds": tc["total_rounds"]} if "total_rounds" in tc else {}),
        **({"totalRounds": tc["totalRounds"]} if "totalRounds" in tc else {}),
        **({"timeLimitSeconds": tc["time_limit_seconds"]} if "time_limit_seconds" in tc else {}),
        **({"timeLimitSeconds": tc["timeLimitSeconds"]} if "timeLimitSeconds" in tc else {}),
        **({"workSeconds": tc["work_seconds"]} if "work_seconds" in tc else {}),
        **({"workSeconds": tc["workSeconds"]} if "workSeconds" in tc else {}),
        **({"circuitRestSeconds": tc["circuit_rest_seconds"]} if "circuit_rest_seconds" in tc else {}),
        **({"circuitRestSeconds": tc["circuitRestSeconds"]} if "circuitRestSeconds" in tc else {}),
        **({"roundRestSeconds": tc["round_rest_seconds"]} if "round_rest_seconds" in tc else {}),
        **({"roundRestSeconds": tc["roundRestSeconds"]} if "roundRestSeconds" in tc else {}),
        **({"rounds": tc["rounds"]} if "rounds" in tc else {}),
        **({"prepCountdownSeconds": tc["prep_countdown_seconds"]} if "prep_countdown_seconds" in tc else {}),
        **({"prepCountdownSeconds": tc["prepCountdownSeconds"]} if "prepCountdownSeconds" in tc else {}),
    }


def _group_to_camel(g: dict) -> dict:
    """Convert an exercise group dict to camelCase."""
    return {
        "groupId": g.get("group_id", g.get("groupId", "")),
        "groupType": g.get("group_type", g.get("groupType", "single")),
        "timerConfig": _timer_config_to_camel(g.get("timer_config", g.get("timerConfig", {"mode": "standard"}))),
        "exercises": [_exercise_to_camel(ex) for ex in g.get("exercises", [])],
        **({"notes": g["notes"]} if g.get("notes") else {}),
    }


def _flat_exercises_to_groups(exercises: list[dict]) -> list[dict]:
    """Transform a flat v1 exercises list into exerciseGroups format (camelCase)."""
    groups = []
    for ex in exercises:
        groups.append({
            "groupId": str(uuid.uuid4()),
            "groupType": "single",
            "timerConfig": {"mode": "standard", "restSeconds": 90},
            "exercises": [_exercise_to_camel(ex)],
        })
    return groups


def _to_camel(row: dict) -> dict:
    """Convert a workout_sessions DB row to camelCase JSON."""
    exercises_raw = row.get("exercises")
    if isinstance(exercises_raw, str):
        exercises_raw = json.loads(exercises_raw)

    schema_version = row.get("schema_version") or 1

    if schema_version >= 2 and exercises_raw:
        # Data is already in exercise_groups format (snake_case from agent) — convert to camelCase
        exercise_groups = [_group_to_camel(g) for g in exercises_raw]
    elif exercises_raw:
        # v1 flat exercises — wrap into single-exercise groups
        exercise_groups = _flat_exercises_to_groups(exercises_raw)
    else:
        exercise_groups = []

    return {
        "id": str(row["id"]),
        "userId": str(row["user_id"]),
        "planId": str(row["plan_id"]) if row.get("plan_id") else None,
        "scheduledDate": row["scheduled_date"].isoformat() if row.get("scheduled_date") else None,
        "title": row.get("title", ""),
        "status": row.get("status", "scheduled"),
        "exerciseGroups": exercise_groups,
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
                  exercises, started_at, completed_at, created_at, schema_version
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
                  exercises, started_at, completed_at, created_at, schema_version
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
                  exercises, started_at, completed_at, created_at, schema_version
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
                  exercises, started_at, completed_at, created_at, schema_version
           FROM workout_sessions WHERE id = $1""",
        session_id,
    )
    return _to_camel(updated)
