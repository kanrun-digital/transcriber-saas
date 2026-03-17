"use client";

import { useEffect, useRef } from "react";
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
  const provisioningRef = useRef(false);

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

    // Prevent double provision calls
    if (provisioningRef.current) return;
    provisioningRef.current = true;

    // Fetch or auto-provision app_user and workspace
    (async () => {
      try {
        // Try to find existing app_user
        const appUsersRes = await apiGet<{ data: AppUser[] }>(API_ROUTES.DATA("app_users"), {
          ncb_user_id: user.id,
          limit: 1,
        });
        let appUser = appUsersRes.data?.[0] ?? null;
        let workspace: Workspace | null = null;

        if (!appUser) {
          // Auto-provision: create app_user + workspace
          console.log("[auth] No app_user found, auto-provisioning...");
          const result = await apiPost<{ appUser: AppUser; workspace: Workspace }>(
            "/api/auth/provision",
            { ncbUserId: user.id, email: user.email, name: user.name }
          );
          appUser = result.appUser;
          workspace = result.workspace;
        } else {
          // Load existing workspace
          const wsRes = await apiGet<{ data: Workspace } | Workspace>(
            API_ROUTES.DATA_RECORD("workspaces", appUser.workspace_id)
          );
          workspace = (wsRes as any).data?.id ? (wsRes as any).data : wsRes as Workspace;
        }

        store.setAppUser(appUser);
        store.setWorkspace(workspace);
      } catch (err) {
        console.error("Failed to load/provision user:", err);
        store.setAppUser(null);
        store.setWorkspace(null);
      } finally {
        store.setLoading(false);
        provisioningRef.current = false;
      }
    })();
  }, [sessionQuery.data, sessionQuery.isLoading]);

  const signInMutation = useMutation({
    mutationFn: authService.signIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      // Don't push to dashboard here — let useEffect handle it after provision
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

  // Auto-redirect to dashboard when appUser loads
  const isAuthenticated = !!store.sessionUser;
  const isReady = isAuthenticated && !!store.appUser && !!store.workspace;

  return {
    sessionUser: store.sessionUser,
    appUser: store.appUser,
    workspace: store.workspace,
    isAdmin: store.isAdmin,
    isLoading: store.isLoading,
    isAuthenticated,
    isReady,
    signIn: signInMutation.mutateAsync,
    signUp: signUpMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    signInError: signInMutation.error,
    signUpError: signUpMutation.error,
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
  };
}
