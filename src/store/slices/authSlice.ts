/**
 * Auth Store Slice
 * Handles authentication state and user profile
 */
import { create } from 'zustand';
import { User } from '../../types';
import { CURRENT_USER } from '../../mock';

export interface AuthSlice {
    currentUser: User | null;
    isAuthenticated: boolean;
    setAuthenticated: (value: boolean) => void;
    setCurrentUser: (user: User | null) => void;
    login: () => void;
    logout: () => void;
    updateProfile: (updates: Partial<User>) => void;
}

export const createAuthSlice = (set: any, get: any): AuthSlice => ({
    currentUser: null,
    isAuthenticated: false,
    setAuthenticated: (value) => set({ isAuthenticated: value }),
    setCurrentUser: (user) => set({ currentUser: user }),
    login: () => set({ isAuthenticated: true, currentUser: CURRENT_USER }),
    logout: () => set({ isAuthenticated: false, currentUser: null }),
    updateProfile: (updates) => set((state: any) => ({
        currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null
    })),
});

// Standalone store for components that only need auth
export const useAuthStore = create<AuthSlice>((set, get) => createAuthSlice(set, get));
