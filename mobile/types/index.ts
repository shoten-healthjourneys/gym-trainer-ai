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
  trainingObjective: string | null;
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

export type ExerciseType = 'strength' | 'cardio';

export interface ExerciseInSession {
  name: string;
  sets: number;
  reps: number;
  youtubeUrl?: string;
  notes?: string;
  exerciseType?: ExerciseType;
  targetRpe?: number;
}

// ===== Timer & Exercise Groups =====
export type TimerMode = 'standard' | 'emom' | 'amrap' | 'circuit';
export type GroupType = 'single' | 'superset' | 'circuit';

export interface TimerConfig {
  mode: TimerMode;

  // Standard mode — rest between sets
  restSeconds?: number;
  warmupRestSeconds?: number;

  // EMOM mode
  intervalSeconds?: number;
  totalRounds?: number;

  // AMRAP mode
  timeLimitSeconds?: number;

  // Circuit / Interval mode
  workSeconds?: number;
  circuitRestSeconds?: number;
  roundRestSeconds?: number;
  rounds?: number;

  // Shared
  prepCountdownSeconds?: number;
}

export interface ExerciseGroup {
  groupId: string;
  groupType: GroupType;
  timerConfig: TimerConfig;
  exercises: ExerciseInSession[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  planId?: string | null;
  scheduledDate: string;
  title: string;
  status: SessionStatus;
  exerciseGroups: ExerciseGroup[];
  /** @deprecated Use exerciseGroups — kept for backward compat during migration */
  exercises?: ExerciseInSession[];
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
  weightKg?: number;
  reps?: number;
  distanceM?: number;
  durationSeconds?: number;
  rpe?: number;
  roundNumber?: number;
  notes?: string;
  loggedAt: string;
}

// ===== Chat =====
export type ChatRole = 'user' | 'assistant';

export type SSEEventType = 'thinking' | 'tool_start' | 'tool_done' | 'text' | 'error' | 'done';

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
export interface VoiceParsedSet {
  weightKg: number;
  reps: number;
  rpe?: number | null;
}

export interface VoiceParseResponse {
  transcript?: string;
  parsed?: VoiceParsedSet;
  needsClarification?: string;
}

// ===== Chat Display =====
export type ToolCallStatus = 'loading' | 'complete';

export interface ToolCallInfo {
  name: string;
  status: ToolCallStatus;
}

export interface ChatDisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
}

// ===== Progress =====
export interface ProgressDataPoint {
  date: string;
  maxWeight: number;
  bestReps: number;
  totalSets: number;
}

export interface ExerciseProgressResponse {
  exerciseName: string;
  dataPoints: ProgressDataPoint[];
}

export interface HistorySetDetail {
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
}

export interface HistoryDayDetail {
  date: string;
  sets: HistorySetDetail[];
}

// ===== API =====
export interface ApiResponse<T> {
  data: T;
  error?: string;
}
