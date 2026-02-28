import logging
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
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    training_goals JSONB,
    experience_level VARCHAR(20),
    available_days INT,
    preferred_unit VARCHAR(5) DEFAULT 'kg',
    training_objective VARCHAR(1000),
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
    reps INT,
    rpe DECIMAL(3,1),
    distance_m DECIMAL(7,1),
    duration_seconds INT,
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
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    muscle_group VARCHAR(50),
    category VARCHAR(30),
    equipment VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm ON exercises USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_lookup ON exercise_logs(user_id, exercise_name, logged_at);
CREATE INDEX IF NOT EXISTS idx_sessions_schedule ON workout_sessions(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_chat_history ON chat_messages(user_id, created_at);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training_objective VARCHAR(1000);
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS distance_m DECIMAL(7,1);
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE exercise_logs ALTER COLUMN reps DROP NOT NULL;
"""


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL)
    from app.seed_exercises import seed_exercises

    async with app.state.pool.acquire() as conn:
        await conn.execute(_SCHEMA_SQL)
        await seed_exercises(conn)
        # Dev user seeding moved to infra/scripts/dev-seed.sql
        # Run manually for local dev: psql -f infra/scripts/dev-seed.sql
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
