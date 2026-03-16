"use client";

import { CheckCircle, Loader2, XCircle, Upload, FileCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { UploadPhase } from "@/types";

interface UploadProgressProps {
  phase: UploadPhase;
  progress: number;
  error: string | null;
  fileName: string;
  onCancel: () => void;
  onReset: () => void;
}

const PHASE_LABELS: Record<UploadPhase, string> = {
  idle: "",
  validating: "Перевірка файлу...",
  presigning: "Підготовка завантаження...",
  uploading: "Завантаження на сервер...",
  completing: "Запуск транскрипції...",
  done: "Готово!",
  error: "Помилка",
};

export function UploadProgress({
  phase,
  progress,
  error,
  fileName,
  onCancel,
  onReset,
}: UploadProgressProps) {
  if (phase === "idle") return null;

  const isUploading = phase === "uploading";
  const isDone = phase === "done";
  const isError = phase === "error";
  const isProcessing = phase === "presigning" || phase === "completing" || phase === "validating";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-3">
        {isDone && <CheckCircle className="h-5 w-5 text-green-500" />}
        {isError && <XCircle className="h-5 w-5 text-destructive" />}
        {isProcessing && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {isUploading && <Upload className="h-5 w-5 text-primary" />}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{PHASE_LABELS[phase]}</p>
        </div>

        {(isUploading || isProcessing) && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Скасувати
          </Button>
        )}
      </div>

      {isUploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{progress}%</p>
        </div>
      )}

      {isError && error && (
        <div className="rounded bg-destructive/10 p-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {(isDone || isError) && (
        <Button variant="outline" size="sm" onClick={onReset} className="w-full">
          {isDone ? "Завантажити ще" : "Спробувати знову"}
        </Button>
      )}
    </div>
  );
}
