// ===== User & Auth =====
export interface User {
  id: string;
  displayName: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: string;
}

// ===== Profile =====
export type TrainingGoal =
  | 'hypertrophy'
  | 'strength'
  | 'endurance'
  | 'weight_loss'
  | 'general_fitness';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  trainingGoals: TrainingGoal[];
  experienceLevel: ExperienceLevel | null;
  availableDays: number | null;
  preferredUnit: 'kg' | 'lbs';
  createdAt: string;
  updatedAt: string;
}

// ===== Workout Plans & Sessions =====
export interface WorkoutPlan {
  id: string;
  userId: string;
  weekStart: string;
  planJson: Record<string, unknown>;
  notes?: string;
  createdAt: string;
}

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped';

export interface ExerciseInSession {
  name: string;
  sets: number;
  reps: number;
  youtubeUrl?: string;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  planId: string;
  scheduledDate: string;
  title: string;
  status: SessionStatus;
  exercises: ExerciseInSession[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// ===== Exercise Logging =====
export interface ExerciseLog {
  id: string;
  userId: string;
  sessionId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  notes?: string;
  loggedAt: string;
}

// ===== Chat =====
export type ChatRole = 'user' | 'assistant';

export type SSEEventType = 'thinking' | 'tool_start' | 'tool_done' | 'text' | 'done';

export interface SSEEvent {
  type: SSEEventType;
  text?: string;
  name?: string;
  status?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: ChatRole;
  content: string;
  toolCalls?: Record<string, unknown>;
  createdAt: string;
}

// ===== Voice =====
export interface VoiceParseRequest {
  transcript: string;
  exercise: string;
  previousSets: { weightKg: number; reps: number }[];
}

export type VoiceParseResult =
  | { sets: { weightKg: number; reps: number; rpe?: number }[] }
  | { needsClarification: string };

// ===== API =====
export interface ApiResponse<T> {
  data: T;
  error?: string;
}
