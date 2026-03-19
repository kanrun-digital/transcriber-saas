"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUpload } from "@/hooks/use-upload";
import { useTranscriptionSettings } from "@/hooks/use-transcription-settings";
import { useWorkspace } from "@/hooks/use-workspace";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { UploadProgress } from "@/components/upload/upload-progress";
import { TranscriptionSettingsPanel } from "@/components/upload/transcription-settings";
import { PresetSelector } from "@/components/presets/preset-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload as UploadIcon,
  Link2,
  CheckCircle2,
  Loader2,
  Youtube,
  FileAudio,
  X,
  Files,
} from "lucide-react";
import { toast } from "sonner";
import type { Preset } from "@/types";

type UploadMode = "file" | "url" | "youtube";

// ============ Types ============

interface BatchFileEntry {
  file: File;
  status: "pending" | "uploading" | "uploaded" | "error";
  transcriptionId: string | null;
  error: string | null;
  progress: number;
}

// ============ Helpers ============

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function convertToDirectUrl(url: string): { directUrl: string; source: string } | { error: string } {
  const trimmed = url.trim();

  // Google Drive
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return {
      directUrl: `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`,
      source: "Google Drive",
    };
  }

  // Dropbox
  if (trimmed.includes("dropbox.com/")) {
    const directUrl = trimmed.includes("dl=0")
      ? trimmed.replace("dl=0", "dl=1")
      : trimmed.includes("dl=")
        ? trimmed
        : trimmed + (trimmed.includes("?") ? "&dl=1" : "?dl=1");
    return { directUrl, source: "Dropbox" };
  }

  // Direct URL
  try {
    new URL(trimmed);
  } catch {
    return { error: "Некоректна URL адреса" };
  }

  if (trimmed.includes("drive.google.com/drive/folders")) {
    return { error: "Це посилання на папку, не на файл. Вставте посилання на конкретний файл." };
  }

  return { directUrl: trimmed, source: "Direct URL" };
}

// ============ Batch upload helpers ============

async function presignFile(
  file: File,
  workspaceId: number,
  appUserId: string | null
): Promise<{ presignedUrl: string; transcriptionId: string }> {
  const res = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      workspaceId,
      appUserId: appUserId || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Presign failed" }));
    throw new Error(err.error || "Помилка отримання URL для завантаження");
  }
  return res.json();
}

async function uploadToS3(
  presignedUrl: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.addEventListener("progress", (e: any) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Помилка мережі при завантаженні")));
    xhr.addEventListener("abort", () => reject(new Error("Завантаження скасовано")));

    xhr.send(file);
  });
}

// Queue helper: run async tasks with concurrency limit
async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number
): Promise<void> {
  const executing: Set<Promise<void>> = new Set();
  for (const task of tasks) {
    const p = task().then(() => {
      executing.delete(p);
    });
    executing.add(p);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

// ============ Component ============

export default function UploadPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();

  // Tab state
  const [activeTab, setActiveTab] = useState<UploadMode>("file");

  // ---------- Batch file upload state ----------
  const [batchFiles, setBatchFiles] = useState<BatchFileEntry[]>([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchUploadedCount, setBatchUploadedCount] = useState(0);
  const [batchAllUploaded, setBatchAllUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- Single file upload (legacy hook for single-file compat) ----------
  const {
    startUpload,
    phase,
    progress,
    file: singleFile,
    transcriptionId: singleTranscriptionId,
    error: singleError,
    cancelUpload,
    reset: resetSingle,
  } = useUpload();

  // ---------- Transcription settings ----------
  const { settings, languages, diarizationAvailable, updateSetting, applyPreset } =
    useTranscriptionSettings();

  // ---------- Preset ----------
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);

  // ---------- URL tab ----------
  const [urlInput, setUrlInput] = useState("");
  const [urlResult, setUrlResult] = useState<{ directUrl: string; source: string } | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(false);

  // ---------- YouTube tab ----------
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeResult, setYoutubeResult] = useState<any>(null);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  // ---------- Transcription start state ----------
  const [startingTranscriptions, setStartingTranscriptions] = useState(false);
  const [startedCount, setStartedCount] = useState(0);

  // ============ Derived state ============

  const isSingleFile = batchFiles.length === 1 && !batchAllUploaded;
  const isBatchMode = batchFiles.length > 1 || batchAllUploaded;

  const singleUploading = phase === "uploading" || phase === "presigning" || phase === "completing";
  const singleDone = phase === "done";
  const singleError_ = phase === "error";

  // Show settings when: single file uploaded OR all batch files uploaded OR URL validated
  const showSettings =
    singleDone ||
    batchAllUploaded ||
    !!urlResult;

  // ============ File selection ============

  const handleFilesSelected = useCallback((selectedFiles: FileList | File[]) => {
    const files = Array.from(selectedFiles);
    if (files.length === 0) return;

    const entries: BatchFileEntry[] = files.map((f: any) => ({
      file: f,
      status: "pending" as const,
      transcriptionId: null,
      error: null,
      progress: 0,
    }));

    setBatchFiles(entries);
    setBatchAllUploaded(false);
    setBatchUploadedCount(0);
  }, []);

  const handleSingleFileSelect = useCallback(
    (selectedFile: File) => {
      // If only one file selected via dropzone, use the single-file flow
      setBatchFiles([
        {
          file: selectedFile,
          status: "pending",
          transcriptionId: null,
          error: null,
          progress: 0,
        },
      ]);
      startUpload(selectedFile);
    },
    [startUpload]
  );

  const handleMultiFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (files.length === 1) {
        // Single file — use legacy flow
        const f = files[0];
        if (f) {
          handleSingleFileSelect(f);
        }
      } else {
        // Multiple files — batch flow
        handleFilesSelected(files);
      }

      // Reset input so same files can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleSingleFileSelect, handleFilesSelected]
  );

  const removeFileFromBatch = useCallback(
    (index: number) => {
      setBatchFiles((prev: any) => prev.filter((_: any, i: number) => i !== index));
    },
    []
  );

  // ============ Batch Upload ============

  const handleBatchUpload = useCallback(async () => {
    if (!workspace || batchFiles.length === 0) return;

    setBatchUploading(true);
    setBatchUploadedCount(0);

    const workspaceId = workspace.id || 0;
    const appUserId = (workspace as any).appUserId || null;

    let uploadedCount = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      const entry = batchFiles[i];
      if (!entry) continue;

      // Mark as uploading
      setBatchFiles((prev: any) =>
        prev.map((e: any, idx: number) =>
          idx === i ? { ...e, status: "uploading" as const, progress: 0 } : e
        )
      );

      try {
        // 1. Presign
        const { presignedUrl, transcriptionId } = await presignFile(
          entry.file,
          workspaceId,
          appUserId
        );

        // 2. Upload to S3
        await uploadToS3(presignedUrl, entry.file, (pct: number) => {
          setBatchFiles((prev: any) =>
            prev.map((e: any, idx: number) =>
              idx === i ? { ...e, progress: pct } : e
            )
          );
        });

        // 3. Mark as uploaded
        uploadedCount++;
        setBatchUploadedCount(uploadedCount);
        setBatchFiles((prev: any) =>
          prev.map((e: any, idx: number) =>
            idx === i
              ? {
                  ...e,
                  status: "uploaded" as const,
                  transcriptionId,
                  progress: 100,
                }
              : e
          )
        );
      } catch (err: any) {
        setBatchFiles((prev: any) =>
          prev.map((e: any, idx: number) =>
            idx === i
              ? {
                  ...e,
                  status: "error" as const,
                  error: err.message || "Помилка завантаження",
                }
              : e
          )
        );
      }
    }

    setBatchUploading(false);

    if (uploadedCount === batchFiles.length) {
      setBatchAllUploaded(true);
      toast.success(`Усі ${uploadedCount} файлів завантажено!`);
    } else if (uploadedCount > 0) {
      setBatchAllUploaded(true);
      toast.warning(`Завантажено ${uploadedCount} з ${batchFiles.length} файлів`);
    } else {
      toast.error("Жоден файл не завантажено");
    }
  }, [workspace, batchFiles]);

  // ============ Start transcriptions ============

  const handleStartTranscription = useCallback(async () => {
    if (!workspace) return;

    const workspaceId = workspace.id || 0;

    // ---------- Single file mode (via legacy hook) ----------
    if (activeTab === "file" && singleDone && singleTranscriptionId) {
      try {
        const res = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            transcriptionId: singleTranscriptionId,
            workspaceId,
            settings,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || "Помилка створення задачі");
        }
        toast.success("Транскрипція запущена!");
        router.push(`/transcriptions/${singleTranscriptionId}`);
      } catch (err: any) {
        toast.error(err.message);
      }
      return;
    }

    // ---------- Batch mode ----------
    if (activeTab === "file" && batchAllUploaded) {
      const uploadedEntries = batchFiles.filter(
        (e: any) => e.status === "uploaded" && e.transcriptionId
      );

      if (uploadedEntries.length === 0) {
        toast.error("Немає завантажених файлів для транскрипції");
        return;
      }

      setStartingTranscriptions(true);
      setStartedCount(0);

      let completed = 0;

      const tasks = uploadedEntries.map((entry: any) => async () => {
        try {
          const res = await fetch("/api/upload/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              transcriptionId: entry.transcriptionId,
              workspaceId,
              settings,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(err.error || "Помилка запуску транскрипції");
          }
          completed++;
          setStartedCount(completed);
        } catch (err: any) {
          completed++;
          setStartedCount(completed);
          toast.error(`Помилка: ${entry.file.name} — ${err.message}`);
        }
      });

      // Run with concurrency limit of 5
      await runWithConcurrency(tasks, 5);

      setStartingTranscriptions(false);
      toast.success(`Запущено ${completed} транскрипцій!`);
      router.push("/transcriptions");
      return;
    }

    // ---------- URL mode ----------
    if (activeTab === "url" && urlResult) {
      setIsUrlLoading(true);
      try {
        const res = await fetch("/api/upload/from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            url: urlResult.directUrl,
            source: urlResult.source,
            workspaceId,
            settings,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || "Помилка завантаження з URL");
        }
        const data = await res.json();
        toast.success("Транскрипція з URL запущена!");
        router.push(`/transcriptions/${data.transcriptionId}`);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsUrlLoading(false);
      }
    }
  }, [
    workspace,
    activeTab,
    singleDone,
    singleTranscriptionId,
    batchAllUploaded,
    batchFiles,
    urlResult,
    settings,
    router,
  ]);

  // ============ Preset ============

  const handlePresetApply = useCallback(
    (preset: Preset | null) => {
      if (!preset) {
        setSelectedPresetId(null);
        return;
      }
      setSelectedPresetId(preset.id ?? null);
      if (preset.config_json) {
        try {
          const config =
            typeof preset.config_json === "string"
              ? JSON.parse(preset.config_json)
              : preset.config_json;
          applyPreset(config);
        } catch {
          // ignore parse errors
        }
      }
      toast.success(`Пресет "${preset.title}" застосовано`);
    },
    [applyPreset]
  );

  // ============ URL ============

  const handleUrlCheck = useCallback(() => {
    setUrlError(null);
    setUrlResult(null);
    if (!urlInput.trim()) {
      setUrlError("Вставте посилання на файл");
      return;
    }
    const result = convertToDirectUrl(urlInput);
    if ("error" in result) {
      setUrlError(result.error);
    } else {
      setUrlResult(result);
      toast.success(`${result.source} — посилання конвертовано`);
    }
  }, [urlInput]);

  // ============ YouTube ============

  const handleYoutubeCheck = useCallback(async () => {
    if (!youtubeUrl.trim() || !workspace) return;
    setYoutubeLoading(true);
    setYoutubeError(null);
    setYoutubeResult(null);
    try {
      const res = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          workspaceId: workspace.id || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setYoutubeResult(data);
      if (data.hasCaptions && data.transcriptionId) {
        toast.success(`Субтитри отримано! ${data.wordCount} слів`);
        router.push(`/transcriptions/${data.transcriptionId}`);
      }
    } catch (err: any) {
      setYoutubeError(err.message);
    } finally {
      setYoutubeLoading(false);
    }
  }, [youtubeUrl, workspace, router]);

  // ============ Reset ============

  const handleReset = useCallback(() => {
    resetSingle();
    setBatchFiles([]);
    setBatchUploading(false);
    setBatchUploadedCount(0);
    setBatchAllUploaded(false);
    setSelectedPresetId(null);
    setStartingTranscriptions(false);
    setStartedCount(0);
    setUrlInput("");
    setUrlResult(null);
    setUrlError(null);
    setYoutubeUrl("");
    setYoutubeResult(null);
    setYoutubeError(null);
  }, [resetSingle]);

  // ============ Render ============

  const uploadedFileCount = batchFiles.filter((e: any) => e.status === "uploaded").length;
  const totalBatchFiles = batchFiles.length;
  const hasPendingBatchFiles =
    batchFiles.length > 1 && batchFiles.some((e: any) => e.status === "pending");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Завантаження</h1>
        <p className="text-muted-foreground">
          Виберіть файл або вставте посилання на аудіо/відео
        </p>
        {selectedPresetId !== null && (
          <Badge variant="secondary" className="mt-2">
            Пресет обрано
          </Badge>
        )}
      </div>

      {/* ==================== Step 1: Choose source ==================== */}
      {!showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Крок 1: Джерело файлу</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(v: any) => setActiveTab(v as UploadMode)}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="file">
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Файл
                </TabsTrigger>
                <TabsTrigger value="url">
                  <Link2 className="w-4 h-4 mr-2" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="youtube">
                  <Youtube className="w-4 h-4 mr-2" />
                  YouTube
                </TabsTrigger>
              </TabsList>

              {/* ---- File Tab ---- */}
              <TabsContent value="file" className="space-y-4 mt-4">
                {/* Single file: dropzone (when no batch selected) */}
                {batchFiles.length <= 1 && !batchUploading && (
                  <FileDropzone
                    onFileSelect={handleSingleFileSelect}
                    file={singleFile}
                    onClear={() => {
                      resetSingle();
                      setBatchFiles([]);
                    }}
                  />
                )}

                {/* Multi-file input */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Або оберіть кілька файлів одразу:
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="audio/*,video/*,.mp3,.wav,.ogg,.flac,.m4a,.mp4,.webm,.avi,.mkv,.mov"
                    onChange={handleMultiFileInput}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90
                      cursor-pointer"
                  />
                </div>

                {/* Batch file list */}
                {batchFiles.length > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Files className="w-4 h-4" />
                        <span className="font-medium">
                          Обрано файлів: {totalBatchFiles}
                        </span>
                      </div>
                      {batchUploading && (
                        <Badge variant="secondary">
                          Завантажено {batchUploadedCount}/{totalBatchFiles} файлів
                        </Badge>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                      {batchFiles.map((entry: any, index: number) => (
                        <div
                          key={`${entry.file.name}-${index}`}
                          className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FileAudio className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {entry.file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(entry.file.size)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {entry.status === "pending" && (
                              <Badge variant="outline" className="text-xs">
                                Очікує
                              </Badge>
                            )}
                            {entry.status === "uploading" && (
                              <Badge variant="secondary" className="text-xs">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                {entry.progress}%
                              </Badge>
                            )}
                            {entry.status === "uploaded" && (
                              <Badge
                                variant="default"
                                className="text-xs bg-green-600"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Завантажено
                              </Badge>
                            )}
                            {entry.status === "error" && (
                              <Badge variant="destructive" className="text-xs">
                                Помилка
                              </Badge>
                            )}

                            {entry.status === "pending" && !batchUploading && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeFileFromBatch(index)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Batch upload button */}
                    {hasPendingBatchFiles && !batchUploading && (
                      <Button
                        onClick={handleBatchUpload}
                        className="w-full"
                        size="lg"
                      >
                        <UploadIcon className="w-4 h-4 mr-2" />
                        Завантажити всі ({totalBatchFiles} файлів)
                      </Button>
                    )}

                    {batchUploading && (
                      <div className="text-center py-2">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        <span className="text-sm">
                          Завантажено {batchUploadedCount}/{totalBatchFiles} файлів...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ---- URL Tab ---- */}
              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Посилання на файл</Label>
                    <div className="flex gap-2">
                      <Input
                        value={urlInput}
                        onChange={(e: any) => {
                          setUrlInput(e.target.value);
                          setUrlError(null);
                          setUrlResult(null);
                        }}
                        placeholder="https://drive.google.com/file/d/.../view або пряме посилання"
                        onKeyDown={(e: any) =>
                          e.key === "Enter" && handleUrlCheck()
                        }
                      />
                      <Button variant="secondary" onClick={handleUrlCheck}>
                        Перевірити
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Підтримуються: Google Drive, Dropbox, прямі посилання на
                    аудіо/відео файли. Система автоматично конвертує в пряме
                    посилання для завантаження.
                  </p>
                  {urlError && (
                    <Alert variant="destructive">
                      <AlertDescription>{urlError}</AlertDescription>
                    </Alert>
                  )}
                  {urlResult && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{urlResult.source}</strong> — посилання готове до
                        обробки
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              {/* ---- YouTube Tab ---- */}
              <TabsContent value="youtube" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>YouTube URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={youtubeUrl}
                        onChange={(e: any) => {
                          setYoutubeUrl(e.target.value);
                          setYoutubeError(null);
                          setYoutubeResult(null);
                        }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        onKeyDown={(e: any) =>
                          e.key === "Enter" && handleYoutubeCheck()
                        }
                      />
                      <Button
                        variant="secondary"
                        onClick={handleYoutubeCheck}
                        disabled={youtubeLoading}
                      >
                        {youtubeLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Отримати"
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Система спробує витягти субтитри безкоштовно. Якщо субтитрів
                    немає — можна транскрибувати через AI.
                  </p>
                  {youtubeError && (
                    <Alert variant="destructive">
                      <AlertDescription>{youtubeError}</AlertDescription>
                    </Alert>
                  )}
                  {youtubeResult && youtubeResult.hasCaptions && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{youtubeResult.videoTitle}</strong> —{" "}
                        {youtubeResult.wordCount} слів, {youtubeResult.language}
                        <br />
                        <span className="text-xs">
                          {youtubeResult.textPreview}...
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                  {youtubeResult && !youtubeResult.hasCaptions && (
                    <Alert>
                      <AlertDescription>
                        Субтитри не знайдено. Використайте вкладку "URL" щоб
                        транскрибувати через AI.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ==================== Upload progress (single file via hook) ==================== */}
      {(singleUploading || singleError_) && batchFiles.length <= 1 && (
        <UploadProgress
          phase={phase}
          progress={progress}
          error={singleError}
          fileName={singleFile?.name || ""}
          onCancel={cancelUpload}
          onReset={resetSingle}
        />
      )}

      {/* ==================== Step 2: Settings ==================== */}
      {showSettings && (
        <>
          {/* Summary of what was uploaded */}
          {singleDone && singleFile && batchFiles.length <= 1 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Файл <strong>{singleFile.name}</strong> завантажено!
              </AlertDescription>
            </Alert>
          )}

          {batchAllUploaded && batchFiles.length > 1 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>
                  Завантажено {uploadedFileCount} з {totalBatchFiles} файлів
                </strong>
                <div className="mt-2 space-y-1">
                  {batchFiles
                    .filter((e: any) => e.status === "uploaded")
                    .map((e: any, i: number) => (
                      <div
                        key={i}
                        className="text-xs text-muted-foreground flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        {e.file.name} ({formatFileSize(e.file.size)})
                      </div>
                    ))}
                  {batchFiles
                    .filter((e: any) => e.status === "error")
                    .map((e: any, i: number) => (
                      <div
                        key={`err-${i}`}
                        className="text-xs text-destructive flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        {e.file.name} — {e.error}
                      </div>
                    ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {urlResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>{urlResult.source}</strong> —{" "}
                {urlResult.directUrl.substring(0, 60)}...
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Крок 2: Налаштування транскрипції</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preset selector with tracked ID */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Пресет (необов&apos;язково)
                </Label>
                <PresetSelector
                  onPresetSelect={handlePresetApply}
                  selectedPresetId={selectedPresetId}
                />
              </div>

              {/* Settings panel */}
              <TranscriptionSettingsPanel
                settings={settings}
                languages={languages as { value: string; label: string }[]}
                diarizationAvailable={diarizationAvailable}
                onUpdate={updateSetting}
              />

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleReset}>
                  Назад
                </Button>

                <Button
                  onClick={handleStartTranscription}
                  className="flex-1"
                  disabled={isUrlLoading || startingTranscriptions}
                >
                  {isUrlLoading && (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Відправляю...
                    </>
                  )}
                  {startingTranscriptions && (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Запущено {startedCount}/{uploadedFileCount} транскрипцій...
                    </>
                  )}
                  {!isUrlLoading && !startingTranscriptions && (
                    <>
                      {batchAllUploaded && batchFiles.length > 1
                        ? `Почати транскрипцію всіх файлів (${uploadedFileCount})`
                        : "Почати транскрипцію"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
