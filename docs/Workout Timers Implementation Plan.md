# Workout Timers & Supersets — Implementation Plan

## Overview

Add intelligent timer support to GymTrainer workouts. The AI agent plans timer
configurations as part of the workout — deciding rest durations, EMOM intervals,
AMRAP time caps, and superset groupings based on the user's goals, experience,
and the training stimulus required. Timer configs persist in the workout plan and
drive the active workout UI.

**Key design principle:** The agent is the trainer. It decides _how_ rest and work
intervals should be structured, not the user. The user executes the plan; the app
enforces the timing.

---

## Data Model Changes

### 010.010 — Exercise Group Model (Supersets & Timer Modes)

The current flat `exercises: ExerciseInSession[]` array becomes a structured list
of **exercise groups**. Each group has a timer mode and contains one or more exercises.

#### New TypeScript Types (`mobile/types/index.ts`)

```typescript
export type TimerMode = 'standard' | 'emom' | 'amrap' | 'circuit';

export interface TimerConfig {
  mode: TimerMode;

  // Standard mode (default) — rest between sets
  restSeconds?: number;            // e.g., 90, 120, 180
  warmupRestSeconds?: number;      // shorter rest for warm-up sets (optional)

  // EMOM mode
  intervalSeconds?: number;        // e.g., 60 (EMOM), 120 (E2MOM)
  totalRounds?: number;            // e.g., 10

  // AMRAP mode
  timeLimitSeconds?: number;       // e.g., 600 (10 min), 900 (15 min)

  // Circuit / Interval mode
  workSeconds?: number;            // e.g., 40
  circuitRestSeconds?: number;     // rest between exercises within circuit
  roundRestSeconds?: number;       // rest between full circuit rounds
  rounds?: number;                 // e.g., 3

  // Shared
  prepCountdownSeconds?: number;   // 3-2-1 before start (default: 5)
}

export interface ExerciseGroup {
  groupId: string;                 // UUID — stable identifier
  groupType: 'single' | 'superset' | 'circuit';
  timerConfig: TimerConfig;
  exercises: ExerciseInSession[];
  notes?: string;                  // e.g., "Alternate with no rest between exercises"
}

// Updated — adds optional fields the agent can set
export interface ExerciseInSession {
  name: string;
  sets: number;
  reps: number;
  youtubeUrl?: string;
  notes?: string;
  exerciseType?: ExerciseType;
  targetRpe?: number;              // Agent-prescribed RPE target
}

// Updated — WorkoutSession.exercises becomes groups
export interface WorkoutSession {
  id: string;
  userId: string;
  planId?: string | null;
  scheduledDate: string;
  title: string;
  status: SessionStatus;
  exerciseGroups: ExerciseGroup[];  // NEW — replaces exercises
  exercises?: ExerciseInSession[];  // DEPRECATED — kept for migration
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}
```

#### Database Migration

```sql
-- workout_sessions.exercises JSONB now stores exercise_groups structure
-- No schema DDL change needed (JSONB is flexible), but all readers/writers
-- must handle the new shape.

-- Add migration flag column to track which sessions use new format
ALTER TABLE workout_sessions ADD COLUMN schema_version INT DEFAULT 1;
-- v1 = flat exercises array, v2 = exercise_groups array
```

### 010.020 — Timer Config Examples by Training Style

These examples show how the agent would populate `TimerConfig` for different
workout styles:

**Standard strength training (e.g., 5×5 Barbell Squat):**
```json
{
  "groupType": "single",
  "timerConfig": {
    "mode": "standard",
    "restSeconds": 180,
    "warmupRestSeconds": 90
  },
  "exercises": [
    { "name": "Barbell Back Squat", "sets": 5, "reps": 5 }
  ]
}
```

**Superset (antagonist pair — Bench Press + Barbell Row):**
```json
{
  "groupType": "superset",
  "timerConfig": {
    "mode": "standard",
    "restSeconds": 120
  },
  "exercises": [
    { "name": "Barbell Bench Press", "sets": 4, "reps": 8 },
    { "name": "Barbell Row", "sets": 4, "reps": 8 }
  ],
  "notes": "Alternate exercises with no rest between them. Rest 2 min after completing both."
}
```

**EMOM (Olympic lift practice):**
```json
{
  "groupType": "single",
  "timerConfig": {
    "mode": "emom",
    "intervalSeconds": 120,
    "totalRounds": 8
  },
  "exercises": [
    { "name": "Power Clean", "sets": 8, "reps": 2 }
  ]
}
```

**AMRAP conditioning finisher:**
```json
{
  "groupType": "circuit",
  "timerConfig": {
    "mode": "amrap",
    "timeLimitSeconds": 600
  },
  "exercises": [
    { "name": "Pull-Up", "sets": 1, "reps": 10 },
    { "name": "Push-Up", "sets": 1, "reps": 15 },
    { "name": "Barbell Back Squat", "sets": 1, "reps": 20, "notes": "Use empty bar" }
  ]
}
```

**Circuit / Interval training:**
```json
{
  "groupType": "circuit",
  "timerConfig": {
    "mode": "circuit",
    "workSeconds": 40,
    "circuitRestSeconds": 10,
    "roundRestSeconds": 60,
    "rounds": 3,
    "prepCountdownSeconds": 5
  },
  "exercises": [
    { "name": "Battle Ropes", "sets": 3, "reps": 1, "exerciseType": "cardio" },
    { "name": "Goblet Squat", "sets": 3, "reps": 1 },
    { "name": "Push-Up", "sets": 3, "reps": 1 }
  ]
}
```

---

## Phase 1 — Configurable Rest Timer + Superset Groups

**Goal:** Replace the hardcoded 90s rest timer with agent-planned rest durations.
Introduce exercise groups and superset support.

### 020.010 — Backend Changes

#### 020.010.010 — Update MCP Tool Schemas

**File:** `backend/app/mcp/server.py`

Update `save_workout_plan`, `add_session_to_week`, and `update_session` to accept
the new `exercise_groups` structure alongside the existing `exercises` format.

**New `exercise_groups` parameter shape** (per session):
```python
exercise_groups: list[dict]  # Each dict has groupId, groupType, timerConfig, exercises
```

**Backward compatibility:** If the agent sends `exercises` (flat list), wrap each
exercise in a single-exercise group with `mode: "standard"` and default rest (90s).
If the agent sends `exercise_groups`, use directly.

#### 020.010.020 — Update Exercise Resolution

**File:** `backend/app/exercise_resolver.py`

No change to resolution logic — but the resolver must now iterate over
`exercise_groups[].exercises[]` instead of the top-level `exercises[]`.

#### 020.010.030 — API Response Transformation

**File:** `backend/app/routes/sessions.py`

When returning sessions via `GET /api/sessions` and `GET /api/sessions/{id}`:
- If `schema_version = 2`: return `exerciseGroups` field (camelCase)
- If `schema_version = 1`: transform flat `exercises` into single-exercise groups
  with `mode: "standard"`, `restSeconds: 90` — so the mobile app always receives
  the new format

#### 020.010.040 — Update Agent System Prompt

**File:** `backend/app/agent/prompts.py`

Add workout timer planning instructions to the system prompt:

```
## Exercise Groups & Timer Planning

When creating workout plans, structure exercises into groups:

### Group Types
- **single**: One exercise performed alone (most common for heavy compounds)
- **superset**: Two exercises performed back-to-back with no rest between them,
  rest only after completing both
- **circuit**: Three or more exercises performed in sequence

### Timer Modes
- **standard**: Traditional set-based training. Specify restSeconds based on:
  - Strength/Power (1-5 reps): 180-300 seconds
  - Hypertrophy (6-12 reps): 90-180 seconds
  - Endurance (12+ reps): 60-90 seconds
  - Warm-up sets: Use warmupRestSeconds (typically 60-90s)
  - Isolation/accessory: 60-90 seconds
  - Compound lifts: 120-300 seconds

### Superset Rules
- Pair antagonist muscles (push/pull, bicep/tricep, chest/back)
- Pair upper/lower for metabolic benefit
- Never superset two heavy compounds (e.g., don't superset squats with deadlifts)
- Rest after the full superset, not between exercises within it

### Output Format
Use exercise_groups in save_workout_plan:
{
  "sessions": [{
    "day": "Monday",
    "title": "Upper Body A",
    "exercise_groups": [
      {
        "group_type": "single",
        "timer_config": { "mode": "standard", "rest_seconds": 180 },
        "exercises": [{ "name": "Barbell Bench Press", "sets": 4, "reps": 6 }]
      },
      {
        "group_type": "superset",
        "timer_config": { "mode": "standard", "rest_seconds": 120 },
        "exercises": [
          { "name": "Dumbbell Row", "sets": 3, "reps": 10 },
          { "name": "Dumbbell Shoulder Press", "sets": 3, "reps": 10 }
        ],
        "notes": "Alternate exercises. Rest after both."
      }
    ]
  }]
}
```

### 020.020 — Mobile Changes

#### 020.020.010 — Update Types & Store

**Files:** `mobile/types/index.ts`, `mobile/stores/workoutStore.ts`

- Add `TimerConfig`, `ExerciseGroup`, `TimerMode` types
- Update `WorkoutSession` to use `exerciseGroups`
- Add migration helper: if API returns `exercises` (old format), transform to groups
- Update `exerciseLogs` indexing — still keyed by exercise name (no change)

#### 020.020.020 — Exercise Group Card Component

**New file:** `mobile/components/workout/ExerciseGroupCard.tsx`

Replaces the current per-exercise `ExerciseCard` rendering in the workout screen.

- Renders group header: "Superset — 2 exercises" or just the exercise name for singles
- Contains one or more `ExerciseCard` children
- Manages group-level rest timer (rest starts after the last exercise in the group)
- For supersets: guides user through Exercise A → Exercise B → Rest → repeat

#### 020.020.030 — Enhanced Rest Timer

**File:** `mobile/components/workout/RestTimer.tsx`

Upgrade from fixed 90s to configurable:
- Accept `durationSeconds` from `timerConfig.restSeconds`
- Add +15s / -15s adjustment buttons
- Add audio notification (expo-av) when timer completes
- Add haptic feedback (expo-haptics) on timer end
- Support background timer via notification (expo-notifications local notification
  scheduled for `durationSeconds` in the future)
- Distinct visual for warm-up rest (when `warmupRestSeconds` is used)

#### 020.020.040 — Update Active Workout Screen

**File:** `mobile/app/(tabs)/workout/[sessionId].tsx`

- Render `ExerciseGroupCard` for each group instead of `ExerciseCard` for each exercise
- Pass `timerConfig` from the group to the rest timer
- Update "total sets logged" calculation to work across groups

#### 020.020.050 — Superset Flow UX

When the user is inside a **superset group**:
1. Show Exercise A card expanded, Exercise B card collapsed but visible
2. User logs a set for Exercise A → **no rest timer fires**
3. Exercise B card auto-expands, Exercise A collapses
4. User logs a set for Exercise B → **rest timer fires** (using group's `restSeconds`)
5. After rest, Exercise A re-expands — cycle repeats
6. Visual indicator shows "Set 2 of 4" for the superset pair

### 020.030 — Phase 1 Testing

| Test | Type | What |
|---|---|---|
| MCP tool accepts `exercise_groups` | Backend (pytest) | Verify save_workout_plan with groups |
| Backward compat — flat exercises still work | Backend (pytest) | Old format auto-wraps |
| API returns `exerciseGroups` for v1 sessions | Backend (pytest) | Migration transform |
| Rest timer uses planned duration | Mobile (Jest) | Timer reads from timerConfig |
| Superset flow — no rest between A and B | Mobile (RNTL) | Rest only after both |
| Audio/haptic fires on timer end | Manual | Device test |
| Background notification | Manual | Lock screen timer |

---

## Phase 2 — EMOM Timer

**Goal:** Add EMOM timer mode that the agent can prescribe for strength-endurance
and conditioning blocks within a workout.

### 030.010 — EMOM Timer Component

**New file:** `mobile/components/workout/EmomTimer.tsx`

Full-screen or expanded-card timer for EMOM blocks.

**UI Elements:**
- Large countdown showing time remaining in current interval
- Round indicator: "Round 4 / 10"
- Total elapsed time (secondary)
- Overall progress bar
- Audio beep at interval start ("GO" signal)
- Different tone at final 3 seconds of interval (warning)
- Pause / Resume button
- End Early button (with confirmation)

**Behaviour:**
- Timer runs continuously from start
- At top of each interval: audio cue + visual flash
- User logs reps/weight during remaining interval time
- Timer shows "REST" in remaining seconds (after user logs their set)
- When all rounds complete: summary screen with per-round log data

**Parameters from `timerConfig`:**
- `intervalSeconds` — length of each interval
- `totalRounds` — number of intervals
- `prepCountdownSeconds` — countdown before first interval starts

### 030.020 — EMOM in Active Workout Screen

**File:** `mobile/app/(tabs)/workout/[sessionId].tsx`

When rendering an `ExerciseGroup` with `timerConfig.mode === 'emom'`:
- Show "EMOM" badge on the group card
- Tapping "Start EMOM" opens `EmomTimer` as a modal or expanded view
- Set logging integrated into the timer view (quick-log: weight + reps per round)
- On complete, all rounds saved as individual `ExerciseLog` entries

### 030.030 — Agent EMOM Planning

**File:** `backend/app/agent/prompts.py`

Add EMOM prescription guidelines to system prompt:

```
### EMOM Timer
Use mode: "emom" for:
- Olympic lifting technique practice (E2MOM or E3MOM with 1-3 reps)
- Strength-endurance conditioning (EMOM with 3-5 reps)
- Metabolic finishers (EMOM with bodyweight or light movements)

Guidelines:
- Work should take 30-50% of the interval (leave adequate rest)
- Typical intervals: 60s (conditioning), 90s (strength-endurance), 120s (heavy singles/doubles)
- Typical duration: 8-20 rounds
- For heavy lifts: use E2MOM or E3MOM (intervalSeconds: 120 or 180)
- For conditioning: use standard EMOM (intervalSeconds: 60)
```

### 030.040 — Backend Exercise Log Extension

**File:** `backend/app/routes/exercises.py`

Add optional `round_number` field to exercise_logs for EMOM tracking:

```sql
ALTER TABLE exercise_logs ADD COLUMN round_number INT;
```

This allows logging per-round data: "Round 3: 80kg × 2 reps" while keeping
the existing `set_number` for standard sets.

### 030.050 — Phase 2 Testing

| Test | Type | What |
|---|---|---|
| EMOM timer counts intervals correctly | Mobile (Jest) | 10 rounds × 60s |
| Audio cue fires at interval start | Manual | Device test |
| Per-round logging creates exercise_logs | Mobile + Backend | Integration |
| Agent prescribes EMOM for appropriate exercises | Manual | Chat test |
| Pause/resume maintains accuracy | Mobile (Jest) | Timer state |
| Background audio cues (app backgrounded) | Manual | Device test |

---

## Phase 3 — AMRAP Timer

**Goal:** Add AMRAP countdown timer for conditioning blocks with round tracking.

### 040.010 — AMRAP Timer Component

**New file:** `mobile/components/workout/AmrapTimer.tsx`

**UI Elements:**
- Large countdown (time remaining) — primary display
- Round counter with increment button (large, thumb-friendly)
- Extra reps counter (for partial final round)
- 1-minute warning — audio + visual flash
- Final 10-second countdown — tick sounds
- Pause / Resume
- End Early (with confirmation)

**Behaviour:**
- Single continuous countdown from `timeLimitSeconds` to 0
- User taps "Round Complete" button as they finish each circuit
- Timer tracks: `{rounds: 7, extraReps: 12}` — final score "7+12"
- On time expiry: loud buzzer + vibration, prompt for final partial reps
- Summary: total rounds, average round time, score

**Parameters from `timerConfig`:**
- `timeLimitSeconds` — total AMRAP duration
- `prepCountdownSeconds` — countdown before start

### 040.020 — AMRAP in Active Workout Screen

When rendering an `ExerciseGroup` with `timerConfig.mode === 'amrap'`:
- Show "AMRAP" badge + time limit on group card
- List exercises in the circuit (read-only during AMRAP)
- "Start AMRAP" button opens timer
- On complete: log total rounds as a single exercise_log entry with
  `notes: "AMRAP 10:00 — 7+12"` and `reps: total_reps_completed`

### 040.030 — Agent AMRAP Planning

```
### AMRAP Timer
Use mode: "amrap" for:
- Conditioning finishers at the end of a strength session
- Benchmark workouts the user can repeat to measure progress
- Metabolic conditioning blocks

Guidelines:
- Short AMRAP (5-8 min): high intensity, fewer exercises (2-3)
- Medium AMRAP (10-15 min): moderate pace, 3-4 exercises
- Long AMRAP (20 min): aerobic focus, 4-5 exercises
- Choose movements the user can perform safely when fatigued
- Prefer bodyweight, kettlebells, or light loads
- Specify rep counts that allow ~45-60s per round
```

### 040.040 — Phase 3 Testing

| Test | Type | What |
|---|---|---|
| AMRAP countdown accurate to ±1s | Mobile (Jest) | Timer precision |
| Round counter increments correctly | Mobile (RNTL) | UI interaction |
| 1-minute warning fires at correct time | Mobile (Jest) | Audio trigger |
| Final score logged to exercise_logs | Integration | Backend receives correct data |
| Agent prescribes AMRAP as finisher | Manual | Chat test |

---

## Phase 4 — Circuit / Interval Timer

**Goal:** Add configurable work/rest interval timer for circuits, Tabata, and
general HIIT blocks.

### 050.010 — Circuit Timer Component

**New file:** `mobile/components/workout/CircuitTimer.tsx`

**UI Elements:**
- Phase indicator: "WORK" (green) / "REST" (red) — full background colour change
- Large countdown for current phase
- Current exercise name (during work phase)
- Next exercise preview (during rest phase)
- Round indicator: "Round 2 / 3"
- Exercise indicator: "Exercise 1 / 3"
- Total elapsed time (secondary)
- Pause / Resume

**Behaviour:**
- Prep countdown (default 5s) → first work interval
- Work interval: shows exercise name + countdown
- Circuit rest: short rest between exercises within a round
- After last exercise in round: round rest (longer)
- After all rounds: completion summary
- Audio: distinct tones for work-start, rest-start, 3-2-1 countdown, round complete

**Parameters from `timerConfig`:**
- `workSeconds` — duration of each work interval
- `circuitRestSeconds` — rest between exercises
- `roundRestSeconds` — rest between full rounds
- `rounds` — number of complete circuits
- `prepCountdownSeconds` — initial countdown

### 050.020 — Tabata Preset

The agent can prescribe Tabata by using circuit mode with specific values:
```json
{
  "mode": "circuit",
  "workSeconds": 20,
  "circuitRestSeconds": 10,
  "rounds": 8,
  "prepCountdownSeconds": 5
}
```

No separate Tabata component needed — the circuit timer handles it. The agent
adds `notes: "Tabata protocol — maximum intensity during work intervals"`.

### 050.030 — Agent Circuit Planning

```
### Circuit / Interval Timer
Use mode: "circuit" for:
- Metabolic conditioning circuits
- Tabata finishers (workSeconds: 20, circuitRestSeconds: 10, rounds: 8)
- Timed station work (e.g., 40s on / 20s transition)
- Group-style circuit classes

Guidelines:
- Work-to-rest ratios:
  - Power: 1:3 to 1:5 (10s work / 30-50s rest)
  - Anaerobic: 1:1 to 1:2 (30s work / 30-60s rest)
  - Aerobic: 2:1 to 3:1 (40s work / 20s rest)
- Tabata (20s/10s) only for experienced users with bodyweight or light load
- Arrange exercises to alternate muscle groups (avoid back-to-back same muscle)
- 3 rounds typical, 4-5 for advanced users
- Include roundRestSeconds (60-90s) for recovery between full circuits
```

### 050.040 — Voice Timer Commands

**File:** `backend/app/agent/prompts.py` (voice parsing context)

Extend voice parsing to handle timer-related utterances during workouts:
- "Start the EMOM" → trigger EMOM timer for current group
- "Next round" → increment AMRAP round counter
- "Skip rest" → dismiss current rest timer
- "Add 30 seconds" → extend current rest timer

These are handled client-side by matching parsed intent to timer actions.

### 050.050 — Phase 4 Testing

| Test | Type | What |
|---|---|---|
| Circuit timer transitions work→rest→work | Mobile (Jest) | State machine |
| Tabata preset: 8 rounds of 20/10 | Mobile (Jest) | 4 min total |
| Different audio for work vs rest | Manual | Device test |
| Exercise name shown during work phase | Mobile (RNTL) | UI rendering |
| Agent prescribes Tabata for conditioning | Manual | Chat test |
| Round rest longer than circuit rest | Mobile (Jest) | Timer logic |

---

## Cross-Phase Concerns

### 060.010 — Audio & Haptics

**Dependencies:** `expo-av` (audio), `expo-haptics` (vibration)

**Audio assets needed:**
- `timer-start.mp3` — short beep for interval/round start
- `timer-end.mp3` — buzzer for timer completion
- `timer-tick.mp3` — tick for 3-2-1 countdown
- `timer-warning.mp3` — distinct tone for 1-minute warning
- `work-start.mp3` — energetic cue for circuit work phase
- `rest-start.mp3` — calm cue for rest phase

**Haptic patterns:**
- Timer end: `Haptics.notificationAsync(NotificationFeedbackType.Success)`
- Warning: `Haptics.notificationAsync(NotificationFeedbackType.Warning)`
- Countdown tick: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`

### 060.020 — Background Timer Support

When the app is backgrounded during an active timer:
1. Schedule a local notification via `expo-notifications` for when the timer expires
2. On foreground: recalculate remaining time from `startTime + duration - now`
3. Cancel notification if timer was already handled

This ensures the user gets notified even with the phone in their pocket.

### 060.030 — Timer State Management

**File:** `mobile/stores/workoutStore.ts`

Add timer state to the workout store:

```typescript
interface TimerState {
  activeGroupId: string | null;     // Which group's timer is running
  timerMode: TimerMode | null;
  startedAt: number | null;         // Date.now() when timer started
  currentRound: number;
  currentPhase: 'prep' | 'work' | 'rest' | 'roundRest' | 'complete';
  isPaused: boolean;
  pausedRemaining: number | null;   // ms remaining when paused
  amrapRounds: number;              // AMRAP round counter
  amrapExtraReps: number;           // AMRAP partial round reps
}
```

Centralising timer state in the store (rather than component state) ensures:
- Timer survives component re-renders and navigation
- Background/foreground transitions work correctly
- Multiple components can read timer state (e.g., notification bar + timer view)

### 060.040 — Migration Strategy

**Existing sessions** (schema_version = 1) must work without changes:
1. Backend API transforms v1 `exercises` → `exerciseGroups` on read
2. Mobile app receives `exerciseGroups` always — no conditional rendering
3. Agent starts producing `exercise_groups` format after prompt update
4. Old sessions remain in DB as-is — transformed on the fly when accessed

No destructive migration. Both formats coexist; v1 is read-transformed to v2.

### 060.050 — Schedule Screen Updates

**File:** `mobile/app/(tabs)/schedule.tsx`

Update workout cards on the schedule screen to show timer metadata:
- Badge icons: clock (rest timer), repeat (EMOM), timer (AMRAP), circuit icon
- Superset indicator: linked exercises shown with bracket/connector
- Estimated duration (sum of: sets × rest + work time for timed modes)

---

## File Change Summary

### Backend

| File | Change |
|---|---|
| `backend/app/mcp/server.py` | Accept `exercise_groups` in save/add/update tools |
| `backend/app/exercise_resolver.py` | Iterate `groups[].exercises[]` |
| `backend/app/routes/sessions.py` | Transform v1→v2 on read, accept v2 on write |
| `backend/app/routes/exercises.py` | Add `round_number` field to log endpoint |
| `backend/app/agent/prompts.py` | Timer planning instructions, superset rules |
| `backend/app/main.py` | Migration: add `schema_version`, `round_number` columns |

### Mobile

| File | Change |
|---|---|
| `mobile/types/index.ts` | Add `TimerConfig`, `ExerciseGroup`, `TimerMode` |
| `mobile/stores/workoutStore.ts` | Add timer state, update session handling |
| `mobile/app/(tabs)/workout/[sessionId].tsx` | Render groups, pass timer config |
| `mobile/app/(tabs)/schedule.tsx` | Show timer badges on workout cards |
| `mobile/components/workout/ExerciseGroupCard.tsx` | **NEW** — group container |
| `mobile/components/workout/ExerciseCard.tsx` | Remove hardcoded 90s, receive config |
| `mobile/components/workout/RestTimer.tsx` | Configurable duration, +/- buttons, audio |
| `mobile/components/workout/EmomTimer.tsx` | **NEW** — EMOM timer (Phase 2) |
| `mobile/components/workout/AmrapTimer.tsx` | **NEW** — AMRAP timer (Phase 3) |
| `mobile/components/workout/CircuitTimer.tsx` | **NEW** — Circuit timer (Phase 4) |
| `mobile/components/workout/SetLogger.tsx` | Minor — handle round_number display |
| `mobile/components/workout/ManualSetDialog.tsx` | Minor — round_number for EMOM |

### Assets

| File | Purpose |
|---|---|
| `mobile/assets/audio/timer-start.mp3` | Interval start beep |
| `mobile/assets/audio/timer-end.mp3` | Timer completion buzzer |
| `mobile/assets/audio/timer-tick.mp3` | 3-2-1 countdown tick |
| `mobile/assets/audio/timer-warning.mp3` | 1-minute warning |

---

## Implementation Order

```
Phase 1 (Configurable Rest + Supersets)
├── 1a. Types & data model (types/index.ts)
├── 1b. Backend — MCP tools accept exercise_groups
├── 1c. Backend — API response transformation (v1 → v2)
├── 1d. Backend — Agent prompt update (rest times + supersets)
├── 1e. Mobile — workoutStore timer state
├── 1f. Mobile — ExerciseGroupCard component
├── 1g. Mobile — RestTimer upgrade (configurable + audio + haptics)
├── 1h. Mobile — Active workout screen (render groups)
├── 1i. Mobile — Superset flow UX
├── 1j. Mobile — Background timer notifications
└── 1k. Testing & validation

Phase 2 (EMOM Timer)
├── 2a. Backend — round_number column migration
├── 2b. Backend — Agent prompt (EMOM guidelines)
├── 2c. Mobile — EmomTimer component
├── 2d. Mobile — EMOM integration in workout screen
├── 2e. Mobile — Per-round logging
└── 2f. Testing & validation

Phase 3 (AMRAP Timer)
├── 3a. Backend — Agent prompt (AMRAP guidelines)
├── 3b. Mobile — AmrapTimer component
├── 3c. Mobile — AMRAP integration + round counter
├── 3d. Mobile — Score logging
└── 3e. Testing & validation

Phase 4 (Circuit / Interval Timer)
├── 4a. Backend — Agent prompt (circuit + Tabata guidelines)
├── 4b. Mobile — CircuitTimer component
├── 4c. Mobile — Tabata preset via circuit config
├── 4d. Mobile — Voice timer commands (stretch goal)
└── 4e. Testing & validation
```

---

## Resolved Questions

1. **Timer sounds** — Use `expo-av` tone generation (programmatic). No external
   audio files needed. Generate beeps, buzzes, and ticks at runtime.

2. **Keep screen awake** — Yes. Use `expo-keep-awake` during all active timers
   (rest, EMOM, AMRAP, circuit).

3. **Progress screen integration** — No. EMOM/AMRAP data does not feed into
   progress charts. Keep timer feature scope contained.

4. **Wear OS** — Not in scope. No architectural accommodation needed.
