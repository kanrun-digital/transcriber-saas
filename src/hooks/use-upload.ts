"use client";

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUploadStore } from "@/stores/upload-store";
import { useAuthStore } from "@/stores/auth-store";
import { presignUpload, uploadToS3 } from "@/services/upload";
import type { SaladMode } from "@/types";

interface UploadOptions {
  language?: string;
  enableDiarization?: boolean;
  saladMode?: SaladMode;
  projectId?: number;
}

export function useUpload() {
  const store = useUploadStore();
  const authStore = useAuthStore();
  const queryClient = useQueryClient();
  const abortRef = useRef<(() => void) | null>(null);

  const startUpload = useCallback(
    async (file: File, options: UploadOptions = {}) => {
      const workspace = authStore.workspace;
      const appUser = authStore.appUser;

      if (!workspace || !appUser) {
        toast.error("Сесія не знайдена. Увійдіть знову.");
        return;
      }

      store.setFile(file);
      store.setError(null);

      try {
        // Phase 1: Presign
        store.setPhase("presigning");
        const presign = await presignUpload({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          workspaceId: workspace.id,
          appUserId: appUser.id,
          projectId: options.projectId,
          language: options.language,
          enableDiarization: options.enableDiarization,
          saladMode: options.saladMode,
        });

        store.setTranscriptionId(presign.transcriptionId);

        // Phase 2: Upload to S3
        store.setPhase("uploading");
        const { promise, abort } = uploadToS3(
          presign.uploadUrl,
          file,
          file.type,
          (percent) => store.setProgress(percent)
        );

        abortRef.current = abort;
        store.setAbortFn(abort);
        await promise;

        // Upload complete — stop here, let user configure settings
        store.setPhase("done");
        toast.success("Файл завантажено! Налаштуйте параметри транскрипції.");

      } catch (error: any) {
        if (error.message === "Завантаження скасовано") {
          store.reset();
          toast.info("Завантаження скасовано");
        } else {
          store.setError(error.message || "Помилка завантаження");
          toast.error(error.message || "Помилка завантаження");
        }
      }
    },
    [authStore.workspace, authStore.appUser, store, queryClient]
  );

  const cancelUpload = useCallback(() => {
    abortRef.current?.();
    store.reset();
  }, [store]);

  return {
    phase: store.phase,
    progress: store.progress,
    file: store.file,
    transcriptionId: store.transcriptionId,
    error: store.error,
    startUpload,
    cancelUpload,
    reset: store.reset,
  };
}
