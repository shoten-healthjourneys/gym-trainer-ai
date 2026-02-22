import { create } from 'zustand';
import type { User } from '../types';
import {
  login as authLogin,
  register as authRegister,
  signOut as authSignOut,
  getStoredToken,
} from '../services/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => string | null;
  clearError: () => void;
}

function decodeUserFromToken(token: string): User | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]!)) as {
      sub?: string;
      name?: string;
      email?: string;
    };
    return {
      id: payload.sub ?? '',
      displayName: payload.name ?? '',
      email: payload.email ?? '',
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      const token = await getStoredToken();
      if (token) {
        const user = decodeUserFromToken(token);
        set({ accessToken: token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false, error: 'Failed to initialize authentication' });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authLogin(email, password);
      const user: User = {
        id: result.userId,
        displayName: result.displayName,
        email: result.email,
      };
      set({ accessToken: result.accessToken, user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ isLoading: false, error: message });
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authRegister(email, password, displayName);
      const user: User = {
        id: result.userId,
        displayName: result.displayName,
        email: result.email,
      };
      set({ accessToken: result.accessToken, user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({ isLoading: false, error: message });
    }
  },

  signOut: async () => {
    try {
      await authSignOut();
    } catch {
      // Ignore
    }
    set({ user: null, accessToken: null, isAuthenticated: false, error: null });
  },

  getAccessToken: () => {
    return get().accessToken;
  },

  clearError: () => {
    set({ error: null });
  },
}));
