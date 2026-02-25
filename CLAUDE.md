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

## Development Workflow
Claude must follow this workflow for all feature work:

1. **Create a feature branch** — never push directly to main
   ```bash
   git checkout -b feat/<short-description>
   ```
2. **Implement the feature** with commits on the branch
3. **Run local checks before pushing:**
   - `cd mobile && npm run preflight` (if mobile changes)
   - `cd backend && pytest` (if backend changes)
4. **Push the branch and open a PR** — CI runs automatically on PRs
5. **Shoten reviews and merges the PR to main**
6. **On merge to main, GitHub Actions automatically deploys only what changed:**
   - `backend/**` changed → deploys backend to Azure (Docker → ACR → Container App)
   - `mobile/**` changed → builds preview APK via EAS
   - Both changed → both deploy in parallel
   - Neither changed (e.g. docs only) → no deploy
7. **For Play Store releases:** Shoten tags with `git tag v*` and pushes

**Never push directly to main.** All changes go through PRs so CI validates
before anything deploys. Main = production.

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

### Mobile Preflight (MUST run before EAS builds)
**Before submitting an EAS build, always run the preflight script:**
```bash
cd mobile && npm run preflight
```
This checks expo-doctor, peer dependencies, TypeScript, and runs `expo prebuild --clean`
to catch Gradle/Kotlin/native config issues locally (~30 seconds) instead of discovering
them after 20 minutes in the EAS build queue.

**When modifying mobile dependencies or native config (app.json plugins, SDK upgrades,
Kotlin version, newArchEnabled), always run preflight before committing.**

### Mobile EAS Build
```bash
cd mobile && eas build --profile preview --platform android --non-interactive
```
- Preview profile builds an APK for internal distribution
- Backend URL is set via `eas.json` preview env: `EXPO_PUBLIC_API_URL`
- Backend live URL: `https://gym-trainer-api.bluehill-f327b734.uksouth.azurecontainerapps.io`

### Docker builds for Azure
**Always use `--platform linux/amd64` when building Docker images for Azure Container Apps.**
Local builds default to ARM (Apple Silicon) which Azure rejects. Example:
```bash
docker build --platform linux/amd64 -t gymtraineracr.azurecr.io/gym-trainer-api:latest backend/
```

### Backend deploy to Azure
```bash
export ACR_NAME=gymtraineracr ACA_NAME=gym-trainer-api RESOURCE_GROUP=gym-trainer-rg
./infra/scripts/deploy.sh
```

### Azure PostgreSQL extensions
Extensions must be allow-listed before use. Currently allow-listed: `pg_trgm`.
To allow-list an extension:
```bash
az postgres flexible-server parameter set --resource-group gym-trainer-rg \
  --server-name gym-trainer-pg --name azure.extensions --value pg_trgm
```

### Expo SDK / React Native Upgrade Notes
- Kotlin version is set in `mobile/app.json` via `expo-build-properties` plugin
- `newArchEnabled` must be `true` (required by react-native-reanimated 4.x+)
- `react` version must match `react-native-renderer` (bundled in react-native). Use npm overrides
  to pin `react-dom` and `react-test-renderer` to the same version. Check with `npm ls react`
- `react` and `react-dom` are excluded from expo install --check (managed via overrides)
- When upgrading Expo SDK, check KSP supported Kotlin versions at https://github.com/google/ksp/releases

## Testing
- Backend: pytest with httpx for route tests, MCP tool tests
- Mobile unit: Jest for stores, services, parsing logic
- Mobile component: React Native Testing Library for UI
- TypeScript: strict mode, `tsc --noEmit` must pass
- Lint: ESLint must pass
- **Mobile preflight:** `cd mobile && npm run preflight` (run before EAS builds)