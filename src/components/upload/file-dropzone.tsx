"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, X, FileAudio } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { useFileValidation } from "@/hooks/use-file-validation";
import { ALLOWED_EXTENSIONS } from "@/constants/limits";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  file: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelect, file, onClear, disabled }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { validateFile, maxMb } = useFileValidation();

  const handleFile = useCallback(
    (f: File) => {
      if (validateFile(f)) {
        onFileSelect(f);
      }
    },
    [validateFile, onFileSelect]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [disabled, handleFile]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  if (file) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <FileAudio className="h-8 w-8 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="rounded-full p-1 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-2 font-medium">
        Перетягніть файл сюди або натисніть для вибору
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Аудіо/відео до {maxMb} МБ ({ALLOWED_EXTENSIONS.join(", ")})
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(",")}
        onChange={onChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
