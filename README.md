# GymTrainer AI

A personal AI-powered gym trainer app. Chat with a Claude-powered agent that plans balanced weekly workouts, finds YouTube exercise demos, and tracks progressive overload via voice logging during sessions.

## How It Works

1. **Chat** with the AI trainer to plan your week — it checks your profile, reviews exercise history, and creates a balanced split
2. **Browse** your schedule with expandable workout cards and YouTube demo links
3. **Train** with the active workout screen — voice-log sets hands-free or tap to enter manually
4. **Track** progressive overload over time with weight-over-time charts

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo SDK 54), Android |
| AI Agent | Claude Sonnet 4.6 via Microsoft Agent Framework |
| Tools | Model Context Protocol (MCP) — 10 tools |
| Voice | Deepgram STT + Claude Haiku 4.5 parsing |
| Backend | Python FastAPI on Azure Container Apps |
| Database | Azure PostgreSQL Flexible Server |
| CI/CD | GitHub Actions + EAS Build |

## Project Structure

```
backend/          Python FastAPI + MCP tool server + Agent Framework
mobile/           React Native Expo app (Android)
infra/            Terraform for Azure infrastructure
.github/          CI/CD workflows
docs/             Architecture docs and archive
```

## Development

### Prerequisites

- Python 3.12+, Node.js 18+
- PostgreSQL (local: user `gymtrainer`, password `gymtrainer_dev`, db `gymtrainer`)
- `backend/.env` with `DATABASE_URL`, `ANTHROPIC_API_KEY`, `JWT_SECRET`, `DEEPGRAM_API_KEY`
- `mobile/.env` with `EXPO_PUBLIC_API_URL`

### Running locally

```bash
# Backend
cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Mobile (web)
cd mobile && npx expo start --web

# Mobile (device)
cd mobile && npx expo start  # scan QR with Expo Go or dev build
```

### Checks

```bash
cd backend && pytest                    # Backend tests
cd mobile && npx tsc --noEmit           # TypeScript
cd mobile && npm run preflight          # Full native preflight (run before EAS builds)
```

## Deployment

All changes go through PRs. On merge to main, GitHub Actions auto-deploys:

- `backend/**` changed → Docker build → ACR → Azure Container App
- `mobile/**` changed → EAS preview APK
- Git tag `v*` → EAS production build for Play Store

### Backend manual deploy

```bash
export ACR_NAME=gymtraineracr ACA_NAME=gym-trainer-api RESOURCE_GROUP=gym-trainer-rg
./infra/scripts/deploy.sh
```

### Mobile build

```bash
cd mobile && eas build --profile preview --platform android --non-interactive
```

## Documentation

- [Implementation Plan](Gym%20Trainer%20Implementation%20Plan.md) — Architecture, sequence diagrams, schema, MCP tools, remaining work
- [Implementation Archive](docs/Implementation%20Plan%20Archive.md) — Phase execution logs, build history, bug resolutions
