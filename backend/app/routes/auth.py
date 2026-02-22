import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.auth import hash_password, verify_password, create_access_token
from app.db import fetch_one, execute, get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    accessToken: str
    userId: str
    email: str
    displayName: str


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(
    body: RegisterRequest,
    conn: asyncpg.Connection = Depends(get_db),
) -> AuthResponse:
    existing = await fetch_one(
        conn,
        "SELECT id FROM profiles WHERE email = $1",
        body.email,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user_id = uuid.uuid4()
    pw_hash = hash_password(body.password)

    await execute(
        conn,
        """INSERT INTO profiles (id, display_name, email, password_hash)
           VALUES ($1, $2, $3, $4)""",
        user_id,
        body.display_name,
        body.email,
        pw_hash,
    )

    token = create_access_token(str(user_id), body.email, body.display_name)

    return AuthResponse(
        accessToken=token,
        userId=str(user_id),
        email=body.email,
        displayName=body.display_name,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    conn: asyncpg.Connection = Depends(get_db),
) -> AuthResponse:
    row = await fetch_one(
        conn,
        "SELECT id, display_name, email, password_hash FROM profiles WHERE email = $1",
        body.email,
    )
    if not row or not row.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        str(row["id"]), row["email"], row["display_name"]
    )

    return AuthResponse(
        accessToken=token,
        userId=str(row["id"]),
        email=row["email"],
        displayName=row["display_name"],
    )
