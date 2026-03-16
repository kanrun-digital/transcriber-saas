"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api-client";
import { API_ROUTES } from "@/constants/routes";
import { USAGE_REFETCH_INTERVAL } from "@/constants/limits";
import { useAuthStore } from "@/stores/auth-store";
import type { UsageSummary } from "@/types";

export function useUsage() {
  const workspace = useAuthStore((s) => s.workspace);
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: ["usage", workspaceId],
    queryFn: () =>
      apiGet<UsageSummary>(API_ROUTES.USAGE, {
        workspaceId: workspaceId!,
      }),
    enabled: !!workspaceId,
    refetchInterval: USAGE_REFETCH_INTERVAL,
    staleTime: 30_000,
  });
}
