"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as presetsService from "@/services/presets";
import { useAuthStore } from "@/stores/auth-store";
import type { Preset } from "@/types";

export function usePresets() {
  const workspace = useAuthStore((s) => s.workspace);
  const workspaceId = workspace?.id;

  const query = useQuery({
    queryKey: ["presets", workspaceId],
    queryFn: () => presetsService.listPresets(workspaceId!),
    enabled: !!workspaceId,
  });

  return query;
}

export function useCreatePreset() {
  const queryClient = useQueryClient();
  const workspace = useAuthStore((s) => s.workspace);

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      category?: string;
      transcription_type: string;
      settings_json: string;
    }) =>
      presetsService.createPreset({
        ...data,
        workspace_id: workspace!.id,
        is_default: 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
      toast.success("Пресет створено");
    },
    onError: (error) => {
      toast.error(`Помилка створення: ${error.message}`);
    },
  });
}

export function useDeletePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: presetsService.deletePreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
      toast.success("Пресет видалено");
    },
    onError: (error) => {
      toast.error(`Помилка видалення: ${error.message}`);
    },
  });
}
