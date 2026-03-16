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
import { Upload as UploadIcon, Link2, Mic, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Preset } from "@/types";

type UploadMode = "file" | "url" | "voice";

export default function UploadPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<UploadMode>("file");
  const [urlInput, setUrlInput] = useState("");
  const [activePresetName, setActivePresetName] = useState<string | null>(null);

  const { startUpload, phase, progress, file, transcriptionId, error, cancelUpload, reset } = useUpload();
  const { settings, languages, diarizationAvailable, updateSetting, applyPreset } = useTranscriptionSettings();
  const isLiteMode = settings.saladMode === "lite";

  const isUploading = phase === "uploading" || phase === "presigning" || phase === "completing";
  const isDone = phase === "done";
  const isError = phase === "error";

  const handleFileSelect = (selectedFile: File) => {
    startUpload(selectedFile);
  };

  const handleStartTranscription = async () => {
    if (!transcriptionId || !workspace) return;
    try {
      const res = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transcriptionId,
          workspaceId: workspace.id,
          mode: isLiteMode ? "lite" : "full",
          languageCode: settings.language,
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
  };

  const handlePresetApply = (preset: Preset | null) => {
    if (!preset) { setActivePresetName(null); return; }
    if (preset.settings_json) {
      try {
        const config = typeof preset.settings_json === "string"
          ? JSON.parse(preset.settings_json) : preset.settings_json;
        applyPreset(config);
      } catch {}
    }
    setActivePresetName(preset.name);
    toast.success(`Пресет "${preset.name}" застосовано`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Завантаження файлу</h1>
        <p className="text-muted-foreground">Виберіть спосіб завантаження та налаштуйте параметри транскрипції</p>
        {activePresetName && <Badge variant="secondary" className="mt-2">Пресет: {activePresetName}</Badge>}
      </div>

      {phase === "idle" && (
        <Card>
          <CardHeader><CardTitle>Крок 1: Вибір файлу</CardTitle></CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UploadMode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="file"><UploadIcon className="w-4 h-4 mr-2" />Файл</TabsTrigger>
                <TabsTrigger value="url"><Link2 className="w-4 h-4 mr-2" />URL</TabsTrigger>
                <TabsTrigger value="voice"><Mic className="w-4 h-4 mr-2" />Голос</TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="space-y-4 mt-4">
                <FileDropzone onFileSelect={handleFileSelect} file={file} onClear={reset} />
              </TabsContent>
              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>URL адреса</Label>
                  <div className="flex gap-2">
                    <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/file.mp3" />
                    <Button variant="secondary" onClick={() => { if (urlInput.trim()) toast.info("URL завантаження — скоро"); }}>Перевірити</Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="voice" className="py-12 text-center mt-4">
                <Mic className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Запис голосу — скоро</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {(isUploading || isError) && (
        <UploadProgress phase={phase} progress={progress} error={error} fileName={file?.name || ""} onCancel={cancelUpload} onReset={reset} />
      )}

      {isDone && (
        <>
          <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>Файл <strong>{file?.name}</strong> завантажено!</AlertDescription></Alert>
          <Card>
            <CardHeader><CardTitle>Крок 2: Налаштування</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Пресети</Label>
                <PresetSelector onPresetSelect={handlePresetApply} />
              </div>
              <TranscriptionSettingsPanel settings={settings} languages={languages as { value: string; label: string }[]} diarizationAvailable={diarizationAvailable} onUpdate={updateSetting} />
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={reset}>Назад</Button>
                <Button onClick={handleStartTranscription} className="flex-1">Почати транскрипцію</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
