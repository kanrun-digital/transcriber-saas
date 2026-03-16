"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/constants/limits";
import { useAuthStore } from "@/stores/auth-store";

function getExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return `.${parts.pop()!.toLowerCase()}`;
}

export function useFileValidation() {
  const workspace = useAuthStore((s) => s.workspace);

  const maxBytes = workspace
    ? workspace.max_file_size_mb * 1024 * 1024
    : MAX_FILE_SIZE_BYTES;

  const maxMb = workspace ? workspace.max_file_size_mb : MAX_FILE_SIZE_BYTES / (1024 * 1024);

  const validateFile = useCallback(
    (file: File): boolean => {
      // Check MIME type or extension
      const mimeOk = (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type);
      const ext = getExtension(file.name);
      const extOk = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);

      if (!mimeOk && !extOk) {
        toast.error("Непідтримуваний формат файлу");
        return false;
      }

      if (file.size > maxBytes) {
        toast.error(`Розмір файлу перевищує ${maxMb} МБ`);
        return false;
      }

      return true;
    },
    [maxBytes, maxMb]
  );

  return { validateFile, maxBytes, maxMb };
}
