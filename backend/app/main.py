import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

from app.config import settings
import app._otel_patch  # noqa: F401 — must run before any agent_framework import
from app.agent import create_agent
from app.routes.auth import router as auth_router
from app.routes.chat import router as chat_router
from app.routes.profile import router as profile_router
from app.routes.sessions import router as sessions_router
from app.routes.exercises import router as exercises_router
from app.routes.voice import router as voice_router


_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    training_goals JSONB,
    experience_level VARCHAR(20),
    available_days INT,
    preferred_unit VARCHAR(5) DEFAULT 'kg',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    week_start DATE NOT NULL,
    UNIQUE(user_id, week_start),
    plan_json JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    plan_id UUID REFERENCES workout_plans(id),
    scheduled_date DATE NOT NULL,
    title VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    exercises JSONB NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    session_id UUID REFERENCES workout_sessions(id),
    exercise_name VARCHAR(100) NOT NULL,
    set_number INT NOT NULL,
    weight_kg DECIMAL(5,1),
    reps INT NOT NULL,
    rpe DECIMAL(3,1),
    notes VARCHAR(500),
    logged_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tool_calls JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_lookup ON exercise_logs(user_id, exercise_name, logged_at);
CREATE INDEX IF NOT EXISTS idx_sessions_schedule ON workout_sessions(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_chat_history ON chat_messages(user_id, created_at);
"""


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL)
    async with app.state.pool.acquire() as conn:
        await conn.execute(_SCHEMA_SQL)
        # Seed dev user if not exists
        exists = await conn.fetchval(
            "SELECT 1 FROM profiles WHERE email = $1", "shotend@gmail.com"
        )
        if not exists:
            await conn.execute(
                """INSERT INTO profiles (id, display_name, email, password_hash,
                   experience_level, training_goals, available_days, preferred_unit)
                   VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)""",
                uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
                "Shoten",
                "shotend@gmail.com",
                "$2b$12$C1vfvXSolWbLSuu6xowxT.TvpB6FbkxhwJzeDzRSjKd6254hLCRni",
                "intermediate",
                '["hypertrophy", "strength"]',
                4,
                "kg",
            )
    agent, mcp_tool = await create_agent()
    app.state.agent = agent
    app.state.mcp_tool = mcp_tool
    yield
    await app.state.mcp_tool.close()
    await app.state.pool.close()


app = FastAPI(title="GymTrainer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(chat_router)
app.include_router(sessions_router)
app.include_router(exercises_router)
app.include_router(voice_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
