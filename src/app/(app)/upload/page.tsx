"use client";

import { useState } from "react";
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
import { Upload as UploadIcon, Link2, CheckCircle2, Loader2, Youtube } from "lucide-react";
import { toast } from "sonner";
import type { Preset } from "@/types";

type UploadMode = "file" | "url" | "youtube";

// ============ URL helpers ============

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

  // Direct URL — check if it looks like a media file or just pass through
  try {
    new URL(trimmed);
  } catch {
    return { error: "Некоректна URL адреса" };
  }

  // Check for folders (not files)
  if (trimmed.includes("drive.google.com/drive/folders")) {
    return { error: "Це посилання на папку, не на файл. Вставте посилання на конкретний файл." };
  }

  return { directUrl: trimmed, source: "Direct URL" };
}

export default function UploadPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<UploadMode>("file");
  const [urlInput, setUrlInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeResult, setYoutubeResult] = useState<any>(null);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [urlResult, setUrlResult] = useState<{ directUrl: string; source: string } | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [activePresetName, setActivePresetName] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);

  const { startUpload, phase, progress, file, transcriptionId, error, cancelUpload, reset } = useUpload();
  const { settings, languages, diarizationAvailable, updateSetting, applyPreset } = useTranscriptionSettings();

  const isUploading = phase === "uploading" || phase === "presigning" || phase === "completing";
  const isDone = phase === "done";
  const isError = phase === "error";

  // Show settings panel when file uploaded OR URL validated
  const showSettings = isDone || !!urlResult;

  const handleFileSelect = (selectedFile: File) => {
    startUpload(selectedFile);
  };

  // URL validation
  const handleUrlCheck = () => {
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
  };

  const handleStartTranscription = async () => {
    if (!workspace) return;

    // File mode
    if (activeTab === "file" && transcriptionId) {
      try {
        const res = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            transcriptionId,
            workspaceId: workspace.id,
            settings,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Помилка створення задачі");
        }
        toast.success("Транскрипція запущена!");
        router.push(`/transcriptions/${transcriptionId}`);
      } catch (err: any) {
        toast.error(err.message);
      }
      return;
    }

    // URL mode
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
            workspaceId: workspace.id,
            settings,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
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
  };

  const handlePresetApply = (preset: Preset | null) => {
    if (!preset) { setActivePresetName(null); setSelectedPresetId(null); return; }
    if (preset.config_json) {
      try {
        const config = typeof preset.config_json === "string"
          ? JSON.parse(preset.config_json) : preset.config_json;
        applyPreset(config);
      } catch {}
    }
    setActivePresetName(preset.title);
    setSelectedPresetId(preset.id);
    toast.success(`Пресет "${preset.title}" застосовано`);
  };

  const handleReset = () => {
    reset();
    setUrlInput("");
    setUrlResult(null);
    setUrlError(null);
    setActivePresetName(null);
    setYoutubeUrl("");
    setYoutubeResult(null);
    setYoutubeError(null);
  };

  // YouTube check
  const handleYoutubeCheck = async () => {
    if (!youtubeUrl.trim() || !workspace) return;
    setYoutubeLoading(true);
    setYoutubeError(null);
    setYoutubeResult(null);
    try {
      const res = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: youtubeUrl.trim(), workspaceId: workspace.id }),
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
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Завантаження</h1>
        <p className="text-muted-foreground">Виберіть файл або вставте посилання на аудіо/відео</p>
        {activePresetName && <Badge variant="secondary" className="mt-2">Пресет: {activePresetName}</Badge>}
      </div>

      {/* Step 1: Choose source */}
      {!showSettings && (
        <Card>
          <CardHeader><CardTitle>Крок 1: Джерело файлу</CardTitle></CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UploadMode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="file"><UploadIcon className="w-4 h-4 mr-2" />Файл з комп'ютера</TabsTrigger>
                <TabsTrigger value="url"><Link2 className="w-4 h-4 mr-2" />Посилання (URL)</TabsTrigger>
                <TabsTrigger value="youtube"><Youtube className="w-4 h-4 mr-2" />YouTube</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 mt-4">
                <FileDropzone onFileSelect={handleFileSelect} file={file} onClear={reset} />
              </TabsContent>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Посилання на файл</Label>
                    <div className="flex gap-2">
                      <Input
                        value={urlInput}
                        onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); setUrlResult(null); }}
                        placeholder="https://drive.google.com/file/d/.../view або пряме посилання"
                        onKeyDown={(e) => e.key === "Enter" && handleUrlCheck()}
                      />
                      <Button variant="secondary" onClick={handleUrlCheck}>Перевірити</Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Підтримуються: Google Drive, Dropbox, прямі посилання на аудіо/відео файли.
                    Система автоматично конвертує в пряме посилання для завантаження.
                  </p>
                  {urlError && (
                    <Alert variant="destructive"><AlertDescription>{urlError}</AlertDescription></Alert>
                  )}
                  {(urlResult as any) && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{(urlResult as any)?.source}</strong> — посилання готове до обробки
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="youtube" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>YouTube URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={youtubeUrl}
                        onChange={(e) => { setYoutubeUrl(e.target.value); setYoutubeError(null); setYoutubeResult(null); }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        onKeyDown={(e) => e.key === "Enter" && handleYoutubeCheck()}
                      />
                      <Button variant="secondary" onClick={handleYoutubeCheck} disabled={youtubeLoading}>
                        {youtubeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Отримати"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Система спробує витягти субтитри безкоштовно. Якщо субтитрів немає — можна транскрибувати через AI.
                  </p>
                  {youtubeError && (
                    <Alert variant="destructive"><AlertDescription>{youtubeError}</AlertDescription></Alert>
                  )}
                  {youtubeResult && youtubeResult.hasCaptions && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{youtubeResult.videoTitle}</strong> — {youtubeResult.wordCount} слів, {youtubeResult.language}
                        <br /><span className="text-xs">{youtubeResult.textPreview}...</span>
                      </AlertDescription>
                    </Alert>
                  )}
                  {youtubeResult && !youtubeResult.hasCaptions && (
                    <Alert>
                      <AlertDescription>
                        Субтитри не знайдено. Використайте вкладку "Посилання (URL)" щоб транскрибувати через AI.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Upload progress (file mode) */}
      {(isUploading || isError) && (
        <UploadProgress phase={phase} progress={progress} error={error} fileName={file?.name || ""} onCancel={cancelUpload} onReset={reset} />
      )}

      {/* Step 2: Settings (shown after file upload OR URL validation) */}
      {showSettings && (
        <>
          {isDone && file && (
            <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>Файл <strong>{file.name}</strong> завантажено!</AlertDescription></Alert>
          )}
          {urlResult && (
            <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription><strong>{urlResult.source}</strong> — {urlResult.directUrl.substring(0, 60)}...</AlertDescription></Alert>
          )}

          <Card>
            <CardHeader><CardTitle>Крок 2: Налаштування транскрипції</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* Preset selector */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Пресет (необов'язково)</Label>
                <PresetSelector onPresetSelect={handlePresetApply} selectedPresetId={selectedPresetId} />
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
                <Button variant="outline" onClick={handleReset}>Назад</Button>
                <Button
                  onClick={handleStartTranscription}
                  className="flex-1"
                  disabled={isUrlLoading}
                >
                  {isUrlLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Відправляю...</>
                  ) : (
                    "Почати транскрипцію"
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
