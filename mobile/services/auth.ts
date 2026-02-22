import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// --- Secure Store Keys ---

const TOKEN_KEY = 'auth_access_token';

// --- Types ---

export interface AuthResult {
  accessToken: string;
  userId: string;
  email: string;
  displayName: string;
}

// --- Public Functions ---

export async function login(email: string, password: string): Promise<AuthResult> {
  const resp = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ detail: 'Login failed' })) as { detail?: string };
    throw new Error(body.detail ?? 'Login failed');
  }

  const data = (await resp.json()) as AuthResult;
  await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
  return data;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  const resp = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });

  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({ detail: 'Registration failed' }))) as { detail?: string };
    throw new Error(body.detail ?? 'Registration failed');
  }

  const data = (await resp.json()) as AuthResult;
  await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
  return data;
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token && isTokenExpired(token)) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return null;
  }
  return token;
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]!)) as { exp?: number };
    if (!payload.exp) return true;

    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp - 60 < nowSeconds;
  } catch {
    return true;
  }
}
