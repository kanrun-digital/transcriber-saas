"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUpload } from "@/hooks/use-upload";
import { useTranscriptionSettings } from "@/hooks/use-transcription-settings";
import { useWorkspace } from "@/hooks/use-workspace";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { UploadProgress } from "@/components/upload/upload-progress";
import { TranscriptionSettings } from "@/components/upload/transcription-settings";
import { PresetSelector } from "@/components/presets/preset-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, Link2, Mic, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Preset } from "@/types";

type UploadMode = "file" | "url" | "voice";
type UploadStep = "select" | "uploading" | "configure" | "submitting";

export default function UploadPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<UploadMode>("file");
  const [uploadStep, setUploadStep] = useState<UploadStep>("select");
  const [urlInput, setUrlInput] = useState("");
  const [activePresetName, setActivePresetName] = useState<string | null>(null);

  const { uploadFile, uploadProgress, isUploading } = useUpload();
  const { settings, isLiteMode, updateSettings, handleTranscriptionTypeChange, buildSerializableSettings } = useTranscriptionSettings();

  const [uploadedData, setUploadedData] = useState<{
    transcriptionId: number; storagePath: string; filename: string;
  } | null>(null);

  const handleFileSelect = async (file: File) => {
    setUploadStep("uploading");
    try {
      const result = await uploadFile(file);
      setUploadedData(result);
      setUploadStep("configure");
      toast.success(`Файл "${file.name}" завантажено`);
    } catch (err: any) {
      toast.error(err.message || "Помилка завантаження");
      setUploadStep("select");
    }
  };

  const handleStartTranscription = async () => {
    if (!uploadedData) return;
    setUploadStep("submitting");

    try {
      const res = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transcriptionId: uploadedData.transcriptionId,
          workspaceId: workspace?.id,
          mode: isLiteMode ? "lite" : "full",
          languageCode: settings.language_code,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Помилка створення задачі");
      }

      toast.success("Транскрипція запущена!");
      router.push(`/transcriptions/${uploadedData.transcriptionId}`);
    } catch (err: any) {
      toast.error(err.message);
      setUploadStep("configure");
    }
  };

  const handlePresetApply = (preset: Preset) => {
    if (preset.config_json) {
      const config = typeof preset.config_json === "string"
        ? JSON.parse(preset.config_json) : preset.config_json;
      updateSettings(config);
      handleTranscriptionTypeChange(preset.transcription_type as "full" | "lite" || "full");
    }
    setActivePresetName(preset.title);
    toast.success(`Пресет "${preset.title}" застосовано`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Завантаження файлу</h1>
        <p className="text-muted-foreground">
          Виберіть спосіб завантаження та налаштуйте параметри транскрипції
        </p>
        {activePresetName && (
          <Badge variant="secondary" className="mt-2">Пресет: {activePresetName}</Badge>
        )}
      </div>

      {/* Step 1: File Selection */}
      {uploadStep === "select" && (
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
                <FileDropzone onFileSelected={handleFileSelect} />
              </TabsContent>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>URL адреса</Label>
                  <div className="flex gap-2">
                    <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/file.mp3" />
                    <Button variant="secondary" onClick={() => {
                      if (urlInput.trim()) { setUploadStep("configure"); toast.success("URL підтверджено"); }
                    }}>Перевірити</Button>
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

      {/* Step 2: Uploading */}
      {uploadStep === "uploading" && (
        <UploadProgress progress={uploadProgress} />
      )}

      {/* Step 3: Configure */}
      {uploadStep === "configure" && (
        <>
          {uploadedData && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Файл <strong>{uploadedData.filename}</strong> завантажено!
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader><CardTitle>Крок 2: Налаштування</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Пресети</Label>
                <PresetSelector onSelect={handlePresetApply} />
              </div>

              <TranscriptionSettings
                settings={settings}
                isLiteMode={isLiteMode}
                onUpdate={updateSettings}
                onTypeChange={handleTranscriptionTypeChange}
              />

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => { setUploadStep("select"); setUploadedData(null); }}>
                  Назад
                </Button>
                <Button onClick={handleStartTranscription} className="flex-1">
                  Почати транскрипцію
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 4: Submitting */}
      {uploadStep === "submitting" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">Створення задачі...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
