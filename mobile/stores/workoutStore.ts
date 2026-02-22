import { create } from 'zustand';
import { addDays, startOfWeek, formatISO } from 'date-fns';
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
  logSet: (sessionId: string, exerciseName: string, set: Partial<ExerciseLog>) => Promise<void>;
  updateSet: (logId: string, updates: Partial<ExerciseLog>) => Promise<void>;
  deleteSet: (logId: string) => Promise<void>;
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

  fetchWeekSessions: async (_weekStart: string) => {
    set({ loading: true, error: null });
    try {
      // TODO: API call in later phase
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  startSession: async (_sessionId: string) => {
    set({ loading: true, error: null });
    try {
      // TODO: API call in later phase
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  completeSession: async (_sessionId: string) => {
    set({ loading: true, error: null });
    try {
      // TODO: API call in later phase
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  logSet: async (_sessionId: string, _exerciseName: string, _setData: Partial<ExerciseLog>) => {
    set({ loading: true, error: null });
    try {
      // TODO: API call in later phase
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  updateSet: async (_logId: string, _updates: Partial<ExerciseLog>) => {
    set({ loading: true, error: null });
    try {
      // TODO: API call in later phase
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  deleteSet: async (_logId: string) => {
    set({ loading: true, error: null });
    try {
      // TODO: API call in later phase
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
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
