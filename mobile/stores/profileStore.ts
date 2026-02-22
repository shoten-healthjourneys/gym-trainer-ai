import { create } from 'zustand';
import { get, put } from '../services/api';
import type { Profile } from '../types';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isFirstSetup: boolean;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  clearProfile: () => void;
  clearError: () => void;
}

const initialState = {
  profile: null,
  loading: false,
  error: null,
  isFirstSetup: false,
};

export const useProfileStore = create<ProfileState>((set) => ({
  ...initialState,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const profile = await get<Profile>('/api/profile');
      const isFirstSetup =
        !profile.trainingGoals || profile.trainingGoals.length === 0;
      set({ profile, loading: false, isFirstSetup });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 404) {
        set({ profile: null, loading: false, isFirstSetup: true });
      } else {
        set({
          loading: false,
          isFirstSetup: true,
          error: e instanceof Error ? e.message : 'Failed to load profile',
        });
      }
    }
  },

  updateProfile: async (data: Partial<Profile>) => {
    set({ loading: true, error: null });
    try {
      const updated = await put<Profile>('/api/profile', data);
      const isFirstSetup =
        !updated.trainingGoals || updated.trainingGoals.length === 0;
      set({ profile: updated, loading: false, isFirstSetup });
    } catch (e: unknown) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to save profile',
      });
    }
  },

  clearProfile: () => {
    set({ ...initialState });
  },

  clearError: () => {
    set({ error: null });
  },
}));
