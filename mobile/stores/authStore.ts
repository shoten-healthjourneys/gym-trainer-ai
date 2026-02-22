import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';
import {
  signIn as authSignIn,
  signOut as authSignOut,
  refreshToken,
  storeTokens,
  isTokenExpired,
  type AuthTokens,
} from '../services/auth';

const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const ID_TOKEN_KEY = 'auth_id_token';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  getAccessToken: () => string | null;
  clearError: () => void;
}

function decodeUserFromIdToken(idToken: string): User | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]!)) as {
      sub?: string;
      name?: string;
      emails?: string[];
      email?: string;
    };
    return {
      id: payload.sub ?? '',
      displayName: payload.name ?? '',
      email: payload.emails?.[0] ?? payload.email ?? '',
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const idToken = await SecureStore.getItemAsync(ID_TOKEN_KEY);

      if (!accessToken) {
        set({ isLoading: false });
        return;
      }

      if (!isTokenExpired(accessToken)) {
        const tokens: AuthTokens = {
          accessToken,
          refreshToken: storedRefreshToken,
          idToken: idToken,
          expiresIn: null,
        };
        const user = idToken ? decodeUserFromIdToken(idToken) : null;
        set({ tokens, user, isAuthenticated: true, isLoading: false });
        return;
      }

      // Token expired, try refresh
      if (storedRefreshToken) {
        const refreshed = await refreshToken(storedRefreshToken);
        if (refreshed) {
          const user = refreshed.idToken ? decodeUserFromIdToken(refreshed.idToken) : null;
          set({ tokens: refreshed, user, isAuthenticated: true, isLoading: false });
          return;
        }
      }

      // No valid tokens
      set({ isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Failed to initialize authentication' });
    }
  },

  signIn: async () => {
    try {
      set({ isLoading: true, error: null });
      const tokens = await authSignIn();
      if (!tokens) {
        set({ isLoading: false, error: 'Sign in was cancelled' });
        return;
      }
      const user = tokens.idToken ? decodeUserFromIdToken(tokens.idToken) : null;
      set({ tokens, user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      set({ isLoading: false, error: message });
    }
  },

  signOut: async () => {
    try {
      await authSignOut();
      set({ user: null, tokens: null, isAuthenticated: false, error: null });
    } catch {
      set({ user: null, tokens: null, isAuthenticated: false, error: null });
    }
  },

  refreshTokens: async () => {
    const { tokens } = get();
    if (!tokens?.refreshToken) return;

    try {
      const refreshed = await refreshToken(tokens.refreshToken);
      if (refreshed) {
        const user = refreshed.idToken ? decodeUserFromIdToken(refreshed.idToken) : null;
        set({ tokens: refreshed, user, isAuthenticated: true });
      } else {
        set({ user: null, tokens: null, isAuthenticated: false });
      }
    } catch {
      set({ user: null, tokens: null, isAuthenticated: false });
    }
  },

  getAccessToken: () => {
    return get().tokens?.accessToken ?? null;
  },

  clearError: () => {
    set({ error: null });
  },
}));
