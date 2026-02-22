from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes.profile import router as profile_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL)
    yield
    await app.state.pool.close()


app = FastAPI(title="GymTrainer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
