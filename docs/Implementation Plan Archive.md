# GymTrainer — Implementation Plan Archive

> **Purpose:** Historical record of the MVP implementation. Contains phase-by-phase execution logs,
> build failure resolutions, and deployment troubleshooting that were part of the original
> implementation plan. Kept for reference but not needed for day-to-day development.
>
> For the current project context, see `Gym Trainer Implementation Plan.md` in the project root.

---

## Phase Execution Log

### Foundation (Hours 0-4) — All 4 agents in parallel — COMPLETED

**Goal:** Deployable infrastructure, running app with navigation, auth plumbed, DB schema live.

| Agent | Tasks | Files | Status |
|---|---|---|---|
| **infra-agent** | T1: Terraform modules (PostgreSQL, ACA, ACR, KV) | `infra/**` | Done |
| | T2: seed.sql schema migration | `infra/scripts/seed.sql` | Done |
| | T3: Dockerfile + deploy script | `backend/Dockerfile`, `infra/scripts/deploy.sh` | Done |
| | T4: GitHub Actions CI + EAS config | `.github/workflows/`, `mobile/eas.json` | Done |
| **backend-agent** | T1: FastAPI scaffold + config + DB connection | `backend/app/main.py`, `config.py`, `db.py` | Done |
| | T2: Auth middleware (JWT issue + validation, bcrypt password hashing) | `backend/app/auth.py` | Done |
| | T3: Profile REST routes (GET/PUT) | `backend/app/routes/profile.py` | Done |
| **frontend-chat-agent** | T1: Expo project init + navigation scaffold | `mobile/app/_layout.tsx`, `package.json` | Done |
| | T2: Paper theme config (colours, fonts, dark mode) | `mobile/theme.ts` | Done |
| | T3: API service (base client + auth headers) | `mobile/services/api.ts` | Done |
| | T4: Auth service (email/password register + login) | `mobile/services/auth.ts` | Done |
| **frontend-workout-agent** | T1: Type definitions (all shared types) | `mobile/types/index.ts` | Done |
| | T2: Workout store skeleton | `mobile/stores/workoutStore.ts` | Done |
| | T3: Profile store skeleton | `mobile/stores/profileStore.ts` | Done |

**Decision log:** Switched from Azure SQL to Azure PostgreSQL Flexible Server (JSONB, asyncpg, better Python DX). Updated all schema, Terraform modules, and backend to use PostgreSQL.

---

### Phase 1: Onboarding — Journeys 1 & 2 (Hours 4-6) — COMPLETED

**Delivers:** User can register/login with email and password and set up their training profile.

| Agent | Tasks | Journey | Files |
|---|---|---|---|
| **infra-agent** | T5: Terraform validate + fix issues | — | `infra/**` |
| | T6: Integration test script (test-api.sh) | — | `infra/scripts/test-api.sh` |
| **backend-agent** | T4: Profile route tests (7 tests, all passing) | J2 | `backend/tests/` |
| **frontend-chat-agent** | T5: Login screen (email/password form) | J1 | `mobile/app/auth/login.tsx` |
| | T6: Auth store (tokens, user state, SecureStore) | J1 | `mobile/stores/authStore.ts` |
| | T7: Auth-gated layout (redirect to login if no token) | J1 | `mobile/app/_layout.tsx` |
| **frontend-workout-agent** | T4: Profile screen (form + save) | J2 | `mobile/app/(tabs)/profile.tsx` |
| | T5: Profile store (GET/PUT integration) | J2 | `mobile/stores/profileStore.ts` |

**Notes:** Terraform validated and fixed (auth module commented out — not needed for email/password MVP). Type mismatch between api.ts UserProfile and types/index.ts Profile flagged — aligned in Phase 2.

---

### Phase 1.5: Azure Deployment & Mobile Build — COMPLETED

#### Azure Infrastructure

All infrastructure provisioned via Terraform and verified:

| Resource | Status | Details |
|---|---|---|
| Resource Group (`gym-trainer-rg`) | Live | uksouth |
| PostgreSQL Flexible Server (`gym-trainer-pg`) | Live | B1ms, PostgreSQL 16, 32GB |
| Container Registry (`gymtraineracr`) | Live | Basic SKU |
| Container App Environment | Live | Log Analytics integrated |
| Container App (`gym-trainer-api`) | Live | 0.25 CPU, 0.5Gi RAM |
| CIAM Tenant | Deleted | Not needed for email/password auth |
| Key Vault | Not deployed | Secrets passed as Container App env vars for now |

#### Terraform Fixes Applied

1. **PostgreSQL zone drift**: Azure auto-assigned zone "3", Terraform tried to remove it → Added `lifecycle { ignore_changes = [zone] }`
2. **Database URL encoding**: Password contains `@` which broke asyncpg URL parsing → Used `urlencode()` in Terraform output
3. **Container App image not found**: Image wasn't pushed to ACR yet → Logged into ACR, tagged and pushed
4. **Container App failed provisioning state**: Previous failed apply created broken resource → Deleted via `az containerapp delete`, re-applied
5. **Docker platform mismatch**: ARM image on Apple Silicon → Rebuilt with `--platform linux/amd64`

#### EAS Build History

**SDK 52 builds:**

| Build | Error | Fix Applied |
|---|---|---|
| #1 | `expo-modules-core:compileReleaseKotlin FAILED` — Kotlin 1.9.25 vs 1.9.24 | Added `expo-build-properties` plugin with `kotlinVersion: "1.9.25"` |
| #2 | Same Kotlin error | `npx expo install --fix`, removed stale android/ folder |
| #3 | `processReleaseMainManifest FAILED` — AndroidX conflict | Added `enableJetifier: true` |
| #4 | Same manifest error | Set `newArchEnabled: false` |
| #5 | `com.android.support:support-compat:28.0.0` conflict | Removed `@react-native-voice/voice`, replaced `react-native-vector-icons` with `@expo/vector-icons` |
| #6 | BUILD SUCCEEDED | All fixes combined |

**SDK 54 builds:**

| Build | Error | Fix Applied |
|---|---|---|
| #7 | `npm ci` failed — `react-dom@19.2.4` requires `react@^19.2.4` | Added npm `overrides` to pin react ecosystem to 19.1.0 |
| #8 | KSP error — `Can't find KSP version for Kotlin 1.9.25` | Bumped `kotlinVersion` to `2.0.21` |
| #9 | `react-native-reanimated:assertNewArchitectureEnabledTask FAILED` | Set `newArchEnabled: true` (required by reanimated 4.x) |
| #10 | App crashed — `react@19.2.4` vs `react-native-renderer@19.1.0` mismatch | Pinned all react packages to 19.1.0 via overrides |
| #11 | BUILD SUCCEEDED + APP RUNS | All SDK 54 fixes combined |

**Post-MVP builds:**

| Build | Error | Fix Applied |
|---|---|---|
| #12 | KSP `2.0.21-1.0.28` too old for Kotlin `2.1.20` (Gradle 8.14.3) | Bumped `kotlinVersion` to `2.1.20` |

#### Packages Removed (build compatibility)

- `@react-native-voice/voice` — pulled in `com.android.support:*:28.0.0` causing AndroidX manifest merger failures. Voice STT needs a replacement package.
- `react-native-vector-icons` — replaced with `@expo/vector-icons` (bundled with Expo)
- `expo-auth-session` — leftover from original OAuth approach

---

### Phase 2: Workout Planning — Journeys 3 & 4 (Hours 6-10) — COMPLETED

**Delivers:** User can chat with AI trainer to plan a week, see the plan on the schedule screen with YouTube links.

| Agent | Tasks | Journey | Files |
|---|---|---|---|
| **backend-agent** | T5: MCP tool server (5 tools) | J3 | `backend/app/mcp/server.py` |
| | T6: Agent Framework setup (Sonnet client + system prompt) | J3 | `backend/app/agent/trainer.py`, `prompts.py` |
| | T7: SSE chat endpoint | J3 | `backend/app/routes/chat.py` |
| | T8: Sessions REST routes (GET week, GET by id) | J4 | `backend/app/routes/sessions.py` |
| | T9: Chat history clear endpoint | J3 | `backend/app/routes/chat.py` |
| **frontend-chat-agent** | T8-T13: SSE consumer, chat screen, streaming components, chat store, PlanCard, new chat | J3 | `mobile/services/sse.ts`, `mobile/app/(tabs)/index.tsx`, `mobile/components/chat/`, `mobile/stores/chatStore.ts` |
| **frontend-workout-agent** | T6-T8: Schedule screen, workout store, YouTube links | J4 | `mobile/app/(tabs)/schedule.tsx`, `mobile/stores/workoutStore.ts` |

**Issues encountered and resolved:**

1. **`agent-framework-anthropic` version**: PyPI has `>=1.0.0b260219`, not `>=1.0.0rc1`
2. **OpenTelemetry SpanAttributes compatibility**: Fixed with `_otel_patch.py` monkey-patch
3. **Content type API**: Beta uses unified `Content` class with `.type` string — fixed to use string matching
4. **Extended thinking signature error**: Disabled thinking (agent works fine without it)
5. **React Native `atob()` missing**: Replaced with custom `base64Decode()` in auth.ts and authStore.ts
6. **MCP connection ordering**: API server must start AFTER MCP server
7. **Tool event matching**: Fixed with `call_id`-based tracking and deduplication
8. **Plan save duplicates**: `save_workout_plan` now does upsert (delete existing + insert)
9. **Raw JSON flash during plan streaming**: Added `stripPlanBlock()` + "Building your plan..." spinner

---

### Phase 3: Active Training — Journeys 5, 6, 7 & 8 (Hours 10-14) — COMPLETED

**Delivers:** User can start a workout, voice-log sets, manually edit mistakes, and complete the session.

| Agent | Tasks | Journey | Files |
|---|---|---|---|
| **backend-agent** | T9: Voice parse endpoint (Deepgram STT + Haiku) | J6 | `backend/app/routes/voice.py` |
| | T10: Exercise log routes (POST, PATCH, DELETE, GET) | J6, J7 | `backend/app/routes/exercises.py` |
| | T11: Session status routes (start, complete) | J5, J8 | `backend/app/routes/sessions.py` |
| | T12: MCP tools: `add_session_to_week`, `update_session`, `delete_session` | J11 | `backend/app/mcp/server.py` |
| **frontend-workout-agent** | T9-T15: Active workout screen, VoiceButton, SetLogger, ManualSetDialog, completion flow | J5-J8 | `mobile/app/(tabs)/workout/`, `mobile/components/workout/`, `mobile/services/voice.ts` |

**Issues encountered and resolved:**

1. **"Start Workout" only showed for today** — Removed `isToday()` restriction
2. **404 on non-current-week sessions** — Added API fallback fetch
3. **`planId` required in TypeScript** — Made optional: `planId?: string | null`
4. **AI couldn't add individual sessions** — Added `add_session_to_week` and `update_session` MCP tools
5. **`Alert.alert` callbacks don't work on web** — Added `Platform.OS === 'web'` check with `window.confirm` fallback
6. **`AnthropicClient` created at module import time** — Moved to `create_agent()` function
7. **Voice hold-to-record UX issues** — Changed to toggle tap
8. **Voice auto-logged without confirmation** — Added confirmation dialog
9. **Snackbar barely readable** — Increased duration, added accent border
10. **Expo SDK 52 → 54 upgrade** — Required by Expo Go on phone
11. **Exercise name fragmentation** — Added canonical `exercises` table, `pg_trgm` extension, 3-tier resolver

**Voice logging flow (final):**
1. Tap mic → starts recording (icon changes to stop, button turns red)
2. Tap again → stops, sends audio to `POST /api/voice/parse`
3. Backend: Deepgram STT → Claude Haiku parses → returns `{transcript, parsed: {weightKg, reps, rpe}}`
4. Confirmation dialog shows transcript + parsed values
5. "Log Set" confirms → calls `POST /api/exercises/log` → set appears in UI
6. "Redo" dismisses → user can try again

---

### Post-MVP Fixes (2026-02-28 — 2026-03-01)

1. **Sunday scheduling bug** — `_DAY_OFFSETS` didn't include day abbreviations. Fixed to accept Mon/Tue/Wed etc.
2. **EAS OTA updates setup** — Added `expo-updates` with `runtimeVersion` policy
3. **Kotlin/KSP version mismatch** — Gradle 8.14.3 brought Kotlin 2.1.20, conflicting with KSP 2.0.21. Upgraded `kotlinVersion` to `2.1.20`.
4. **MCP tool JSON string params** — AI agent couldn't reliably pass `session` as JSON string. Changed `add_session_to_week`, `save_workout_plan`, `update_session` to accept structured data (explicit params / dict / list).
5. **Model upgrade** — Upgraded agent from Claude Sonnet 4.5 to Sonnet 4.6 for better tool use accuracy.

---

## Original Agent Team Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    LEAD (Shoten + Claude Code)                │
│                    Mode: Delegate                            │
├──────────┬──────────┬──────────────────┬────────────────────┤
│  infra   │ backend  │  frontend-chat   │  frontend-workout  │
│  agent   │  agent   │    agent         │     agent          │
│          │          │                  │                    │
│ Owns:    │ Owns:    │ Owns:            │ Owns:              │
│ infra/*  │ backend/*│ chat screen,     │ schedule, workout, │
│          │          │ SSE, auth,       │ progress, profile, │
│          │          │ theme            │ voice, types       │
└──────────┴──────────┴──────────────────┴────────────────────┘
```

Key principles used:
- **Strict file ownership** — no two agents edited the same file
- **Rich spawn prompts** — each agent got full context
- **Journey-based execution** — each phase delivered complete end-to-end user journeys

---

## Original Code Snippets

These were planning-stage examples. The actual implementations are in the codebase.

### Agent Setup (planned vs actual)

Planned: separate `planning_client` and `voice_client` with `get_mcp_tool()`.
Actual: `MCPStreamableHTTPTool` for MCP connection, single `create_agent()` factory in `backend/app/agent/trainer.py`.

### SSE Consumer (planned vs actual)

Planned: `fetch()` + `ReadableStream` reader.
Actual: `XMLHttpRequest` with `onprogress` handler (better React Native compatibility) in `mobile/services/sse.ts`.

---

## Estimated Monthly Cost (Azure, personal use)

| Resource | SKU | ~Cost/month |
|---|---|---|
| Azure PostgreSQL | Burstable B1ms | £10 |
| Container Apps | Consumption (scale to 0) | £0-5 |
| Container Registry | Basic | £3.50 |
| Key Vault | Standard | £0.02 |
| Log Analytics | Free tier (5GB) | £0 |
| **Total** | | **~£14-19/month** |
