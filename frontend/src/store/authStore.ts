import { create } from 'zustand';
import api from '@/lib/api';

/**
 * STATELESS AUTH STORE
 * 
 * This store does NOT persist auth state to localStorage.
 * Session is managed via HttpOnly cookies - browser handles this automatically.
 * 
 * On page load, we call /auth/me to check if the session is valid.
 * The server validates the session cookie and returns user info.
 * 
 * NO tokens are stored in JavaScript.
 * NO redirects are triggered automatically.
 */

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'student';
  studentId?: string;
  rollNumber?: string;
  employeeId?: string;
  department?: string;
  batch?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  // Legacy compatibility
  hasHydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  dobLogin: (studentId: string, dob: string, examId?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
  // Legacy
  setHasHydrated: (state: boolean) => void;
  refreshAccessToken: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId?: string;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  // Legacy - always true now (no hydration needed)
  hasHydrated: true,
  accessToken: null,
  refreshToken: null,

  // Legacy no-op
  setHasHydrated: () => {},
  
  // Legacy - always returns false (no token refresh, we use cookies)
  refreshAccessToken: async () => false,

  /**
   * Login with email and password
   * Returns result object - does NOT auto-redirect
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data.data || response.data;
      const user = data.user || data;
      const token = data.token || response.data.token;

      // Store token in memory for API calls (fallback for when cookies don't work)
      if (token) {
        sessionStorage.setItem('auth_token', token);
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
        accessToken: token || null,
      });

      return { success: true, user };
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  /**
   * DOB-based login for students
   * Returns result object - does NOT auto-redirect
   */
  dobLogin: async (studentId: string, dob: string, examId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/dob-login', { studentId, dob, examId });
      const data = response.data.data || response.data;
      const user = data.user || data;
      const token = data.token || response.data.token;

      // Store token in memory for API calls (fallback for when cookies don't work)
      if (token) {
        sessionStorage.setItem('auth_token', token);
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
        accessToken: token || null,
      });

      return { success: true, user };
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  /**
   * Register new user
   */
  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/register', data);
      set({ isLoading: false, error: null });
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  /**
   * Logout - clears session on server
   * Does NOT auto-redirect
   */
  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear stored token
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('auth_token');
      }
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null,
        accessToken: null,
      });
    }
  },

  /**
   * Check authentication status by calling /auth/me
   * This is the ONLY way to verify if user is authenticated
   * Called on page load - server checks the session cookie
   * 
   * Returns true if authenticated, false otherwise
   * Does NOT redirect - caller decides what to do
   */
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      const data = response.data.data || response.data;
      const user = data.user || data;

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });

      return true;
    } catch (error: any) {
      // Session invalid or expired - this is normal, not an error
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null, // Don't show error for normal session expiry
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
