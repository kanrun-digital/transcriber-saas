"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import * as authService from "@/services/auth";
import { apiGet, apiPost } from "@/services/api-client";
import { API_ROUTES } from "@/constants/routes";
import { ROUTES } from "@/constants/routes";
import type { AppUser, Workspace } from "@/types";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const store = useAuthStore();

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: authService.getSession,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // When session loaded, resolve appUser + workspace
  useEffect(() => {
    if (sessionQuery.isLoading) {
      store.setLoading(true);
      return;
    }

    const user = sessionQuery.data?.user ?? null;
    store.setSession(user);

    if (!user) {
      store.setAppUser(null);
      store.setWorkspace(null);
      store.setLoading(false);
      return;
    }

    // Fetch or auto-provision app_user and workspace
    (async () => {
      try {
        // Try to find existing app_user
        const appUsers = await apiGet<{ data: AppUser[] }>(API_ROUTES.DATA("app_users"), {
          ncb_user_id: user.id,
          limit: 1,
        });
        let appUser = appUsers.data?.[0] ?? null;
        let workspace: Workspace | null = null;

        if (!appUser) {
          // Auto-provision: create app_user + workspace + workspace_member
          const result = await apiPost<{ appUser: AppUser; workspace: Workspace }>(
            "/api/auth/provision",
            { ncbUserId: user.id, email: user.email, name: user.name }
          );
          appUser = result.appUser;
          workspace = result.workspace;
        } else {
          // Load existing workspace
          workspace = await apiGet<Workspace>(
            API_ROUTES.DATA_RECORD("workspaces", appUser.workspace_id)
          );
        }

        store.setAppUser(appUser);
        store.setWorkspace(workspace);
      } catch (err) {
        console.error("Failed to load/provision user:", err);
        store.setAppUser(null);
        store.setWorkspace(null);
      } finally {
        store.setLoading(false);
      }
    })();
  }, [sessionQuery.data, sessionQuery.isLoading]);

  const signInMutation = useMutation({
    mutationFn: authService.signIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      router.push(ROUTES.DASHBOARD);
    },
  });

  const signUpMutation = useMutation({
    mutationFn: authService.signUp,
    onSuccess: () => {
      router.push(ROUTES.LOGIN);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      store.reset();
      queryClient.clear();
      router.push(ROUTES.LOGIN);
    },
  });

  return {
    sessionUser: store.sessionUser,
    appUser: store.appUser,
    workspace: store.workspace,
    isAdmin: store.isAdmin,
    isLoading: store.isLoading,
    isAuthenticated: !!store.sessionUser,
    signIn: signInMutation.mutateAsync,
    signUp: signUpMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    signInError: signInMutation.error,
    signUpError: signUpMutation.error,
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
  };
}
