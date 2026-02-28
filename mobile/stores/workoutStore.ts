import { create } from 'zustand';
import { addDays, startOfWeek, formatISO } from 'date-fns';
import { get as apiGet, post, patch, del } from '../services/api';
import type { WorkoutSession, ExerciseLog } from '../types';

function getCurrentWeekStart(): string {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return formatISO(monday, { representation: 'date' });
}

interface WorkoutState {
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  exerciseLogs: Record<string, ExerciseLog[]>;
  currentWeekStart: string;
  loading: boolean;
  error: string | null;

  fetchWeekSessions: (weekStart: string) => Promise<void>;
  startSession: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  logSet: (sessionId: string, exerciseName: string, setData: { weightKg?: number; reps?: number; distanceM?: number; durationSeconds?: number; rpe?: number; notes?: string }) => Promise<void>;
  updateSet: (logId: string, updates: Partial<ExerciseLog>) => Promise<void>;
  deleteSet: (logId: string, exerciseName: string) => Promise<void>;
  fetchExerciseLogs: (sessionId: string, exerciseName: string) => Promise<void>;
  setActiveSession: (session: WorkoutSession | null) => void;
  nextWeek: () => void;
  prevWeek: () => void;
  clearError: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  sessions: [],
  activeSession: null,
  exerciseLogs: {},
  currentWeekStart: getCurrentWeekStart(),
  loading: false,
  error: null,

  fetchWeekSessions: async (weekStart: string) => {
    set({ loading: true, error: null });
    try {
      const sessions = await apiGet<WorkoutSession[]>(`/api/sessions?week_start=${encodeURIComponent(weekStart)}`);
      set({ sessions, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  startSession: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      const session = await post<WorkoutSession>(`/api/sessions/${encodeURIComponent(sessionId)}/start`, {});
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
      const session = await post<WorkoutSession>(`/api/sessions/${encodeURIComponent(sessionId)}/complete`, {});
      set((state) => ({
        activeSession: null,
        exerciseLogs: {},
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
    set({ activeSession: session });
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
}));
