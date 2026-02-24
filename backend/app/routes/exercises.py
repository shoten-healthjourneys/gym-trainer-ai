import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.auth import get_current_user
from app.db import get_db, fetch_one, fetch_all, execute
from app.exercise_resolver import resolve_exercise_name

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


class LogSetRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    session_id: str
    exercise_name: str
    weight_kg: float
    reps: int
    rpe: float | None = None
    notes: str | None = None


class LogSetUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    weight_kg: float | None = None
    reps: int | None = None
    rpe: float | None = None
    notes: str | None = None


def _log_to_camel(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "userId": str(row["user_id"]),
        "sessionId": str(row["session_id"]),
        "exerciseName": row["exercise_name"],
        "setNumber": row["set_number"],
        "weightKg": float(row["weight_kg"]) if row.get("weight_kg") is not None else None,
        "reps": row["reps"],
        "rpe": float(row["rpe"]) if row.get("rpe") is not None else None,
        "notes": row.get("notes"),
        "loggedAt": row["logged_at"].isoformat() if row.get("logged_at") else None,
    }


async def _validate_session(conn, session_id: uuid.UUID, user_id: uuid.UUID, require_in_progress: bool = True) -> dict:
    """Validate session exists, belongs to user, and optionally is in_progress."""
    row = await fetch_one(
        conn,
        "SELECT id, user_id, status FROM workout_sessions WHERE id = $1",
        session_id,
    )
    if not row or str(row["user_id"]) != str(user_id):
        raise HTTPException(status_code=404, detail="Session not found")
    if require_in_progress and row["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")
    return row


@router.post("/log", status_code=status.HTTP_201_CREATED)
async def create_exercise_log(
    body: LogSetRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = uuid.UUID(user["user_id"])
    session_id = uuid.UUID(body.session_id)
    await _validate_session(conn, session_id, user_id)

    # Resolve to canonical exercise name
    resolved_name = await resolve_exercise_name(conn, body.exercise_name)

    # Auto-calculate set_number
    result = await fetch_one(
        conn,
        "SELECT COALESCE(MAX(set_number), 0) + 1 AS next_set FROM exercise_logs WHERE session_id = $1 AND exercise_name = $2",
        session_id,
        resolved_name,
    )
    set_number = result["next_set"]

    log_id = uuid.uuid4()
    await execute(
        conn,
        """INSERT INTO exercise_logs (id, user_id, session_id, exercise_name, set_number, weight_kg, reps, rpe, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
        log_id, user_id, session_id, resolved_name, set_number,
        body.weight_kg, body.reps, body.rpe, body.notes,
    )

    row = await fetch_one(conn, "SELECT * FROM exercise_logs WHERE id = $1", log_id)
    return _log_to_camel(row)


@router.get("/log")
async def list_exercise_logs(
    session_id: str = Query(...),
    exercise_name: str = Query(...),
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = uuid.UUID(user["user_id"])
    sid = uuid.UUID(session_id)
    await _validate_session(conn, sid, user_id, require_in_progress=False)

    rows = await fetch_all(
        conn,
        """SELECT * FROM exercise_logs
           WHERE session_id = $1 AND exercise_name = $2 AND user_id = $3
           ORDER BY set_number""",
        sid, exercise_name, user_id,
    )
    return [_log_to_camel(r) for r in rows]


@router.patch("/log/{log_id}")
async def update_exercise_log(
    log_id: uuid.UUID,
    body: LogSetUpdate,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = uuid.UUID(user["user_id"])

    existing = await fetch_one(conn, "SELECT * FROM exercise_logs WHERE id = $1 AND user_id = $2", log_id, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Exercise log not found")

    updates = []
    values = []
    idx = 2  # $1 is log_id, $2 is user_id

    if body.weight_kg is not None:
        idx += 1
        updates.append(f"weight_kg = ${idx}")
        values.append(body.weight_kg)
    if body.reps is not None:
        idx += 1
        updates.append(f"reps = ${idx}")
        values.append(body.reps)
    if body.rpe is not None:
        idx += 1
        updates.append(f"rpe = ${idx}")
        values.append(body.rpe)
    if body.notes is not None:
        idx += 1
        updates.append(f"notes = ${idx}")
        values.append(body.notes)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(updates)
    await execute(
        conn,
        f"UPDATE exercise_logs SET {set_clause} WHERE id = $1 AND user_id = $2",
        log_id, user_id, *values,
    )

    row = await fetch_one(conn, "SELECT * FROM exercise_logs WHERE id = $1", log_id)
    return _log_to_camel(row)


@router.delete("/log/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise_log(
    log_id: uuid.UUID,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = uuid.UUID(user["user_id"])

    existing = await fetch_one(conn, "SELECT id FROM exercise_logs WHERE id = $1 AND user_id = $2", log_id, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Exercise log not found")

    await execute(conn, "DELETE FROM exercise_logs WHERE id = $1 AND user_id = $2", log_id, user_id)
