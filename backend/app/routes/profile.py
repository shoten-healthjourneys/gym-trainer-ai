import json
import uuid
from datetime import datetime

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.auth import get_current_user
from app.db import fetch_one, execute, get_db

router = APIRouter(prefix="/api", tags=["profile"])


class ProfileResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    display_name: str
    email: str
    training_goals: list[str] | None = None
    experience_level: str | None = None
    available_days: int | None = None
    preferred_unit: str = "kg"
    created_at: str
    updated_at: str


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    training_goals: list[str] | None = None
    experience_level: str | None = None
    available_days: int | None = None
    preferred_unit: str | None = None


def _row_to_response(row: dict) -> ProfileResponse:
    return ProfileResponse(
        id=str(row["id"]),
        display_name=row["display_name"],
        email=row["email"],
        training_goals=json.loads(row["training_goals"]) if isinstance(row.get("training_goals"), str) else row.get("training_goals"),
        experience_level=row.get("experience_level"),
        available_days=row.get("available_days"),
        preferred_unit=row.get("preferred_unit", "kg"),
        created_at=row["created_at"].isoformat() if isinstance(row["created_at"], datetime) else str(row["created_at"]),
        updated_at=row["updated_at"].isoformat() if isinstance(row["updated_at"], datetime) else str(row["updated_at"]),
    )


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
) -> ProfileResponse:
    row = await fetch_one(
        conn,
        "SELECT * FROM profiles WHERE id = $1",
        uuid.UUID(user["user_id"]),
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    return _row_to_response(row)


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
) -> ProfileResponse:
    # Build SET clauses dynamically from provided fields
    updates: list[str] = []
    values: list[object] = []
    idx = 1

    if body.training_goals is not None:
        idx += 1
        updates.append(f"training_goals = ${idx}")
        values.append(json.dumps(body.training_goals))

    if body.experience_level is not None:
        idx += 1
        updates.append(f"experience_level = ${idx}")
        values.append(body.experience_level)

    if body.available_days is not None:
        idx += 1
        updates.append(f"available_days = ${idx}")
        values.append(body.available_days)

    if body.preferred_unit is not None:
        idx += 1
        updates.append(f"preferred_unit = ${idx}")
        values.append(body.preferred_unit)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    updates.append("updated_at = NOW()")
    set_clause = ", ".join(updates)

    await execute(
        conn,
        f"UPDATE profiles SET {set_clause} WHERE id = $1",
        uuid.UUID(user["user_id"]),
        *values,
    )

    row = await fetch_one(
        conn,
        "SELECT * FROM profiles WHERE id = $1",
        uuid.UUID(user["user_id"]),
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    return _row_to_response(row)
