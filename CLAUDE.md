# GymTrainer Project

## Project Overview
Personal AI gym trainer React Native app. Backend is Python FastAPI on Azure,
AI agent uses Microsoft Agent Framework with Claude Sonnet, tools via MCP.

## Implementation Plan
Detailed implementation plan can be found here - Gym Trainer Implementation Plan.md

## Architecture
- Sequence diagrams can be found here - Architecture
- `infra/` — Terraform for Azure (PostgreSQL, Container Apps, AD B2C, Key Vault)
- `backend/` — Python FastAPI + MCP tool server + Agent Framework
- `mobile/` — React Native Expo (Android only)

## Conventions
- TypeScript strict mode in mobile/
- Python 3.12+ with type hints in backend/
- All API responses use camelCase JSON
- Exercise names are canonical: "Barbell Bench Press" not "bench"
- Use Zustand for all React Native state
- All dates in ISO 8601 UTC

## File Ownership Rules
- infra-agent: only touches files in `infra/`, `backend/Dockerfile`, `.github/`, and `mobile/eas.json`
- backend-agent: only touches files in `backend/` (except Dockerfile)
- frontend-chat-agent: owns `mobile/app/(tabs)/index.tsx`, `mobile/components/chat/`,
  `mobile/services/api.ts`, `mobile/services/sse.ts`, `mobile/stores/chatStore.ts`,
  `mobile/stores/authStore.ts`, `mobile/app/auth/`, `mobile/app/_layout.tsx`,
  `mobile/theme.ts` (React Native Paper theme config)
- frontend-workout-agent: owns `mobile/app/(tabs)/schedule.tsx`,
  `mobile/app/(tabs)/workout/`, `mobile/app/(tabs)/progress.tsx`,
  `mobile/app/(tabs)/profile.tsx`, `mobile/components/workout/`,
  `mobile/components/progress/`, `mobile/services/voice.ts`,
  `mobile/stores/workoutStore.ts`, `mobile/stores/profileStore.ts`,
  `mobile/types/index.ts`

## Shared interfaces (types/index.ts) — owned by frontend-workout-agent
Other agents should coordinate via lead before modifying types.

## Local Development

### Prerequisites
- PostgreSQL running locally (user: `gymtrainer`, password: `gymtrainer_dev`, db: `gymtrainer`)
- Backend `.env` at `backend/.env` (gitignored) with `DATABASE_URL`, `ANTHROPIC_API_KEY`, `JWT_SECRET`, `DEEPGRAM_API_KEY`, `CORS_ORIGINS`
- Mobile `.env` at `mobile/.env` with `EXPO_PUBLIC_API_URL` (e.g. `http://192.168.0.190:8000` for device, `http://localhost:8000` for web)

### Running locally
1. **Backend:** `cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
2. **Mobile (web):** `cd mobile && npx expo start --web`
3. **Mobile (device):** `cd mobile && npx expo start` then scan QR

### Verifying
- Backend health: `curl http://localhost:8000/health`
- TypeScript: `cd mobile && npx tsc --noEmit`
- Backend tests: `cd backend && pytest`

## Deployment

### Docker builds for Azure
**Always use `--platform linux/amd64` when building Docker images for Azure Container Apps.**
Local builds default to ARM (Apple Silicon) which Azure rejects. Example:
```bash
docker build --platform linux/amd64 -t gymtraineracr.azurecr.io/gym-trainer-api:latest backend/
```

### Azure PostgreSQL extensions
Extensions must be allow-listed before use. Currently allow-listed: `pg_trgm`.
To allow-list an extension:
```bash
az postgres flexible-server parameter set --resource-group gym-trainer-rg \
  --server-name gym-trainer-pg --name azure.extensions --value pg_trgm
```

## Testing
- Backend: pytest with httpx for route tests, MCP tool tests
- Mobile unit: Jest for stores, services, parsing logic
- Mobile component: React Native Testing Library for UI
- TypeScript: strict mode, `tsc --noEmit` must pass
- Lint: ESLint must pass