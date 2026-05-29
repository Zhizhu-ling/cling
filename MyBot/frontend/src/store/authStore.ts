import { create } from 'zustand';
import { authApi } from '@/api/auth';
import type { UserProfile, LoginParams } from '@/api/auth';

const TOKEN_KEY = 'token';

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (params: LoginParams) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  loading: false,

  login: async (params: LoginParams) => {
    const response = await authApi.login(params);
    const { token, user } = response.data.data;

    localStorage.setItem(TOKEN_KEY, token);
    set({
      token,
      user,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  fetchMe: async () => {
    try {
      set({ loading: true });
      const response = await authApi.getMe();
      const user = response.data.data;
      set({ user, isAuthenticated: true, loading: false });
    } catch {
      // If fetchMe fails (e.g., token expired), clear auth state
      localStorage.removeItem(TOKEN_KEY);
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },
}));
