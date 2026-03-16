"use client";

import { create } from "zustand";
import type { SessionUser, AppUser, Workspace } from "@/types";

interface AuthState {
  sessionUser: SessionUser | null;
  appUser: AppUser | null;
  workspace: Workspace | null;
  isLoading: boolean;
  isAdmin: boolean;

  setSession: (user: SessionUser | null) => void;
  setAppUser: (user: AppUser | null) => void;
  setWorkspace: (ws: Workspace | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  sessionUser: null,
  appUser: null,
  workspace: null,
  isLoading: true,
  isAdmin: false,

  setSession: (user) => set({ sessionUser: user }),

  setAppUser: (user) =>
    set({
      appUser: user,
      isAdmin: user?.role === "owner" || user?.role === "admin",
    }),

  setWorkspace: (ws) => set({ workspace: ws }),
  setLoading: (loading) => set({ isLoading: loading }),

  reset: () =>
    set({
      sessionUser: null,
      appUser: null,
      workspace: null,
      isLoading: false,
      isAdmin: false,
    }),
}));
