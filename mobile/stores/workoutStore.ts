import { create } from 'zustand';
import { addDays, startOfWeek, formatISO } from 'date-fns';
import { get as apiGet, post, patch, del } from '../services/api';
import type { WorkoutSession, ExerciseLog, ExerciseGroup, TimerMode } from '../types';

function getCurrentWeekStart(): string {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return formatISO(monday, { representation: 'date' });
}

/**
 * Migrate old-format sessions that have `exercises` but no `exerciseGroups`.
 * Wraps each exercise in a single-exercise group with standard rest.
 */
function migrateSession(session: WorkoutSession): WorkoutSession {
  if (session.exerciseGroups && session.exerciseGroups.length > 0) {
    return session;
  }
  if (!session.exercises || session.exercises.length === 0) {
    return { ...session, exerciseGroups: [] };
  }
  const exerciseGroups: ExerciseGroup[] = session.exercises.map((ex, i) => ({
    groupId: `migrated-${session.id}-${i}`,
    groupType: 'single',
    timerConfig: { mode: 'standard', restSeconds: 90 },
    exercises: [ex],
  }));
  return { ...session, exerciseGroups };
}

interface TimerState {
  activeGroupId: string | null;
  timerMode: TimerMode | null;
  timerStartedAt: number | null;
  currentRound: number;
  currentPhase: 'prep' | 'work' | 'rest' | 'roundRest' | 'complete';
  isPaused: boolean;
  pausedRemaining: number | null;
  amrapRounds: number;
  amrapExtraReps: number;
}

interface WorkoutState extends TimerState {
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  exerciseLogs: Record<string, ExerciseLog[]>;
  currentWeekStart: string;
  loading: boolean;
  error: string | null;

  fetchWeekSessions: (weekStart: string) => Promise<void>;
  startSession: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  reopenSession: (sessionId: string) => Promise<void>;
  logSet: (sessionId: string, exerciseName: string, setData: { weightKg?: number; reps?: number; distanceM?: number; durationSeconds?: number; rpe?: number; notes?: string; roundNumber?: number }) => Promise<void>;
  updateSet: (logId: string, updates: Partial<ExerciseLog>) => Promise<void>;
  deleteSet: (logId: string, exerciseName: string) => Promise<void>;
  fetchExerciseLogs: (sessionId: string, exerciseName: string) => Promise<void>;
  setActiveSession: (session: WorkoutSession | null) => void;
  nextWeek: () => void;
  prevWeek: () => void;
  clearError: () => void;

  // Timer actions
  startTimer: (groupId: string, mode: TimerMode) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  setPhase: (phase: TimerState['currentPhase']) => void;
  incrementRound: () => void;
  setAmrapScore: (rounds: number, extraReps: number) => void;
}

const initialTimerState: TimerState = {
  activeGroupId: null,
  timerMode: null,
  timerStartedAt: null,
  currentRound: 0,
  currentPhase: 'prep',
  isPaused: false,
  pausedRemaining: null,
  amrapRounds: 0,
  amrapExtraReps: 0,
};

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  sessions: [],
  activeSession: null,
  exerciseLogs: {},
  currentWeekStart: getCurrentWeekStart(),
  loading: false,
  error: null,
  ...initialTimerState,

  fetchWeekSessions: async (weekStart: string) => {
    set({ loading: true, error: null });
    try {
      const raw = await apiGet<WorkoutSession[]>(`/api/sessions?week_start=${encodeURIComponent(weekStart)}`);
      const sessions = raw.map(migrateSession);
      set({ sessions, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  startSession: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      const raw = await post<WorkoutSession>(`/api/sessions/${encodeURIComponent(sessionId)}/start`, {});
      const session = migrateSession(raw);
      set((state) => ({
        activeSession: session,
        sessions: state.sessions.map((s) => (s.id === sessionId ? session : s)),
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  completeSession: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      const raw = await post<WorkoutSession>(`/api/sessions/${encodeURIComponent(sessionId)}/complete`, {});
      const session = migrateSession(raw);
      set((state) => ({
        activeSession: null,
        exerciseLogs: {},
        ...initialTimerState,
        sessions: state.sessions.map((s) => (s.id === sessionId ? session : s)),
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  reopenSession: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      const raw = await post<WorkoutSession>(`/api/sessions/${encodeURIComponent(sessionId)}/reopen`, {});
      const session = migrateSession(raw);
      set((state) => ({
        activeSession: session,
        sessions: state.sessions.map((s) => (s.id === sessionId ? session : s)),
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  logSet: async (sessionId: string, exerciseName: string, setData) => {
    set({ loading: true, error: null });
    try {
      const log = await post<ExerciseLog>('/api/exercises/log', {
        sessionId,
        exerciseName,
        ...setData,
      });
      set((state) => ({
        exerciseLogs: {
          ...state.exerciseLogs,
          [exerciseName]: [...(state.exerciseLogs[exerciseName] ?? []), log],
        },
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  updateSet: async (logId: string, updates: Partial<ExerciseLog>) => {
    set({ loading: true, error: null });
    try {
      const updated = await patch<ExerciseLog>(`/api/exercises/log/${encodeURIComponent(logId)}`, updates);
      set((state) => {
        const newLogs = { ...state.exerciseLogs };
        for (const key of Object.keys(newLogs)) {
          newLogs[key] = newLogs[key]!.map((l) => (l.id === logId ? updated : l));
        }
        return { exerciseLogs: newLogs, loading: false };
      });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  deleteSet: async (logId: string, exerciseName: string) => {
    set({ loading: true, error: null });
    try {
      await del(`/api/exercises/log/${encodeURIComponent(logId)}`);
      set((state) => ({
        exerciseLogs: {
          ...state.exerciseLogs,
          [exerciseName]: (state.exerciseLogs[exerciseName] ?? []).filter((l) => l.id !== logId),
        },
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  fetchExerciseLogs: async (sessionId: string, exerciseName: string) => {
    try {
      const logs = await apiGet<ExerciseLog[]>(
        `/api/exercises/log?session_id=${encodeURIComponent(sessionId)}&exercise_name=${encodeURIComponent(exerciseName)}`,
      );
      set((state) => ({
        exerciseLogs: {
          ...state.exerciseLogs,
          [exerciseName]: logs,
        },
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  setActiveSession: (session: WorkoutSession | null) => {
    set({ activeSession: session ? migrateSession(session) : null });
  },

  nextWeek: () => {
    const current = new Date(get().currentWeekStart);
    const next = addDays(current, 7);
    set({ currentWeekStart: formatISO(next, { representation: 'date' }) });
  },

  prevWeek: () => {
    const current = new Date(get().currentWeekStart);
    const prev = addDays(current, -7);
    set({ currentWeekStart: formatISO(prev, { representation: 'date' }) });
  },

  clearError: () => {
    set({ error: null });
  },

  // Timer actions
  startTimer: (groupId: string, mode: TimerMode) => {
    set({
      activeGroupId: groupId,
      timerMode: mode,
      timerStartedAt: Date.now(),
      currentRound: 1,
      currentPhase: 'prep',
      isPaused: false,
      pausedRemaining: null,
      amrapRounds: 0,
      amrapExtraReps: 0,
    });
  },

  pauseTimer: () => {
    const { timerStartedAt, isPaused } = get();
    if (isPaused || timerStartedAt === null) return;
    set({
      isPaused: true,
      pausedRemaining: Date.now() - timerStartedAt,
    });
  },

  resumeTimer: () => {
    const { isPaused, pausedRemaining } = get();
    if (!isPaused || pausedRemaining === null) return;
    set({
      isPaused: false,
      timerStartedAt: Date.now() - pausedRemaining,
      pausedRemaining: null,
    });
  },

  stopTimer: () => {
    set(initialTimerState);
  },

  setPhase: (phase: TimerState['currentPhase']) => {
    set({ currentPhase: phase });
  },

  incrementRound: () => {
    set((state) => ({ currentRound: state.currentRound + 1 }));
  },

  setAmrapScore: (rounds: number, extraReps: number) => {
    set({ amrapRounds: rounds, amrapExtraReps: extraReps });
  },
}));
