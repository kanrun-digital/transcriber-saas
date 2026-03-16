"use client";

import { useAuthStore } from "@/stores/auth-store";

export function useWorkspace() {
  const workspace = useAuthStore((s) => s.workspace);
  const appUser = useAuthStore((s) => s.appUser);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  return {
    workspace,
    appUser,
    isAdmin,
    workspaceId: workspace?.id ?? null,
    workspaceName: workspace?.name ?? "",
    plan: workspace?.plan ?? "free",
    isActive: workspace?.status === "active",
  };
}
