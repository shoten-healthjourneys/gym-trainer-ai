import { getStoredToken } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiError {
  message: string;
  status: number;
}

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function request<T>(
  method: string,
  path: string,
  options?: RequestOptions,
): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    // TODO: trigger token refresh flow
    throw new ApiRequestError('Unauthorized', 401);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `Request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(errorBody) as ApiError;
      message = parsed.message ?? message;
    } catch {
      // Use default message
    }
    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function get<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, { body });
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PUT', path, { body });
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, { body });
}

export function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}

// --- Typed API functions (stubs) ---

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  heightCm: number | null;
  weightKg: number | null;
  fitnessGoal: string | null;
  experienceLevel: string | null;
}

export interface Session {
  id: string;
  scheduledAt: string;
  status: string;
  exercises: unknown[];
}

export function getProfile(): Promise<UserProfile> {
  return get<UserProfile>('/api/profile');
}

export function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return put<UserProfile>('/api/profile', data);
}

export function getSessions(weekStart: string): Promise<Session[]> {
  return get<Session[]>(`/api/sessions?weekStart=${encodeURIComponent(weekStart)}`);
}

export function getSession(id: string): Promise<Session> {
  return get<Session>(`/api/sessions/${encodeURIComponent(id)}`);
}
