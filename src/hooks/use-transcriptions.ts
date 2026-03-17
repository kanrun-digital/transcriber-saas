"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as transcriptionsService from "@/services/transcriptions";
import { useAuthStore } from "@/stores/auth-store";
import { TRANSCRIPTION_POLL_INTERVAL, TRANSCRIPTIONS_PAGE_SIZE } from "@/constants/limits";
import type { Transcription } from "@/types";

export function useTranscriptions(params?: {
  page?: number;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
}) {
  const workspace = useAuthStore((s) => s.workspace);
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: ["transcriptions", workspaceId, params],
    queryFn: () =>
      transcriptionsService.listTranscriptions({
        workspaceId: workspaceId!,
        page: params?.page || 1,
        limit: TRANSCRIPTIONS_PAGE_SIZE,
        status: params?.status,
        sort: params?.sort,
        order: params?.order,
      }),
    enabled: !!workspaceId,
    staleTime: 10_000,
    select: (data) => ({
      ...data,
      data: (data.data || []).filter((tx: any) => !tx.deleted_at),
    }),
  });
}

export function useTranscription(id: number | null) {
  const hasActiveJob = (tx: Transcription | undefined) =>
    tx?.status === "uploaded" || tx?.status === "transcribing";

  const query = useQuery({
    queryKey: ["transcription", id],
    queryFn: () => transcriptionsService.getTranscription(id!),
    enabled: !!id,
    refetchInterval: (query) =>
      hasActiveJob(query.state.data) ? TRANSCRIPTION_POLL_INTERVAL : false,
  });

  return query;
}

export function useDeleteTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transcriptionsService.deleteTranscription,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
      queryClient.removeQueries({ queryKey: ["transcription", id] });
      toast.success("Транскрипцію видалено");
    },
    onError: (error) => {
      toast.error(`Помилка видалення: ${error.message}`);
    },
  });
}

export function useSyncRag() {
  const queryClient = useQueryClient();
  const workspace = useAuthStore((s) => s.workspace);

  return useMutation({
    mutationFn: (transcriptionId: number) =>
      transcriptionsService.syncRag(transcriptionId, workspace!.id),
    onSuccess: (_data, transcriptionId) => {
      queryClient.invalidateQueries({ queryKey: ["transcription", transcriptionId] });
      queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
      toast.success("RAG синхронізацію запущено");
    },
    onError: (error) => {
      toast.error(`Помилка RAG: ${error.message}`);
    },
  });
}

export function useArtifactUrls(transcriptionId: number | null) {
  return useQuery({
    queryKey: ["artifacts", transcriptionId],
    queryFn: () => transcriptionsService.getArtifactUrls(transcriptionId!),
    enabled: !!transcriptionId,
    staleTime: 30 * 60 * 1000, // presigned URLs valid for ~1h
  });
}
