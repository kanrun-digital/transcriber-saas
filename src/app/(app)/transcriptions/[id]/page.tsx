"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transcriptionsService } from "@/services/transcriptions";
import { StatusBadge } from "@/components/transcriptions/status-badge";
import { TranscriptionSettingsPanel } from "@/components/upload/transcription-settings";
import { useTranscriptionSettings } from "@/hooks/use-transcription-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, RefreshCw, Trash2, MessageSquare, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { formatBytes, formatDuration, formatDate } from "@/lib/utils";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TranscriptionSettings } from "@/types";

export default function TranscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  const { settings, updateSetting } = useTranscriptionSettings();
  const [isStarting, setIsStarting] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");

  const { data: tx, isLoading, error } = useQuery({
    queryKey: ["transcription", id],
    queryFn: () => transcriptionsService.getById(Number(id)),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "transcribing" || status === "uploaded" ? 5000 : false;
    },
  });

  const { data: artifacts } = useQuery({
    queryKey: ["artifacts", id],
    queryFn: () => transcriptionsService.getArtifactUrls(Number(id)),
    enabled: tx?.status === "completed",
  });

  // Load presets
  const { data: presetsData } = useQuery({
    queryKey: ["presets", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/data/presets?workspace_id=${workspaceId}`);
      return res.json();
    },
    enabled: !!workspaceId && tx?.status === "uploaded",
  });

  const presets = presetsData?.data || [];

  // Apply preset
  const handlePresetChange = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = presets.find((p: any) => String(p.id) === presetId);
    if (!preset) return;
    try {
      const config = typeof preset.config_json === "string" ? JSON.parse(preset.config_json) : preset.config_json;
      if (config.language_code) updateSetting("language", config.language_code);
      if (config.diarization !== undefined) updateSetting("enableDiarization", config.diarization);
      if (config.sentence_level_timestamps !== undefined) updateSetting("sentenceTimestamps", config.sentence_level_timestamps);
      if (config.word_level_timestamps !== undefined) updateSetting("wordTimestamps", config.word_level_timestamps);
      if (config.srt !== undefined) updateSetting("srt", config.srt);
      if (config.summarize !== undefined) updateSetting("summarize", config.summarize);
      if (config.custom_prompt) updateSetting("customPrompt", config.custom_prompt);
      if (config.translate) updateSetting("translate", config.translate);
      if (config.sentence_diarization !== undefined) updateSetting("sentenceDiarization", config.sentence_diarization);
      if (config.multichannel !== undefined) updateSetting("multichannel", config.multichannel);
      if (config.llm_translation) updateSetting("llmTranslation", config.llm_translation);
      if (config.srt_translation) updateSetting("srtTranslation", config.srt_translation);
      toast.success(`Пресет "${preset.title}" застосовано`);
    } catch (e) {
      toast.error("Помилка застосування пресету");
    }
  }, [presets, updateSetting]);

  // Start transcription
  const handleStartTranscription = async () => {
    if (!tx) return;
    setIsStarting(true);
    try {
      const res = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptionId: tx.id,
          workspaceId: tx.workspace_id,
          s3Key: tx.storage_url,
          settings: {
            language: settings.language,
            enableDiarization: settings.enableDiarization,
            saladMode: settings.saladMode,
            sentenceTimestamps: settings.sentenceTimestamps,
            wordTimestamps: settings.wordTimestamps,
            srt: settings.srt,
            summarize: settings.summarize,
            translate: settings.translate,
            customVocabulary: settings.customVocabulary,
            customPrompt: settings.customPrompt,
            sentenceDiarization: settings.sentenceDiarization,
            multichannel: settings.multichannel,
            returnAsFile: settings.returnAsFile,
            llmTranslation: settings.llmTranslation,
            srtTranslation: settings.srtTranslation,
            overallSentiment: settings.overallSentiment,
            overallClassification: settings.overallClassification,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      toast.success("Транскрипцію запущено!");
      queryClient.invalidateQueries({ queryKey: ["transcription", id] });
    } catch (err: any) {
      toast.error(err.message || "Помилка запуску");
    } finally {
      setIsStarting(false);
    }
  };

  const syncRagMutation = useMutation({
    mutationFn: () => transcriptionsService.syncRag(Number(id), tx?.workspace_id || 0),
    onSuccess: () => {
      toast.success("RAG індексація запущена");
      queryClient.invalidateQueries({ queryKey: ["transcription", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => transcriptionsService.delete(Number(id)),
    onSuccess: () => { toast.success("Видалено"); router.push("/transcriptions"); },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <Alert variant="destructive"><AlertDescription>Транскрипцію не знайдено</AlertDescription></Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push("/transcriptions")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Назад
          </Button>
          <h1 className="text-2xl font-bold">{tx.original_filename || `Транскрипція #${tx.id}`}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={tx.status} ragStatus={tx.rag_status} />
            {tx.salad_mode && <Badge variant="outline">{tx.salad_mode === "full" ? "Full" : "Lite"}</Badge>}
            {tx.detected_language && <Badge variant="outline">{tx.detected_language}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => syncRagMutation.mutate()}
            disabled={tx.status !== "completed" || syncRagMutation.isPending}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncRagMutation.isPending ? "animate-spin" : ""}`} />
            Reindex
          </Button>
          {tx.status === "completed" && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/chat?transcription=${tx.id}`)}>
              <MessageSquare className="w-4 h-4 mr-1" /> Чат
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => {
            if (confirm("Видалити транскрипцію?")) deleteMutation.mutate();
          }} disabled={deleteMutation.isPending}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader><CardTitle>Деталі</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {tx.duration_seconds != null && tx.duration_seconds > 0 && (
              <div><span className="text-muted-foreground">Тривалість</span><p className="font-medium">{formatDuration(tx.duration_seconds)}</p></div>
            )}
            {tx.file_size_bytes != null && (
              <div><span className="text-muted-foreground">Розмір</span><p className="font-medium">{formatBytes(tx.file_size_bytes)}</p></div>
            )}
            {tx.word_count != null && tx.word_count > 0 && (
              <div><span className="text-muted-foreground">Слів</span><p className="font-medium">{tx.word_count.toLocaleString()}</p></div>
            )}
            {tx.num_speakers != null && tx.num_speakers > 0 && (
              <div><span className="text-muted-foreground">Спікерів</span><p className="font-medium">{tx.num_speakers}</p></div>
            )}
            <div><span className="text-muted-foreground">Створено</span><p className="font-medium">{formatDate(tx.created_at)}</p></div>
            {tx.processing_time_seconds != null && tx.processing_time_seconds > 0 && (
              <div><span className="text-muted-foreground">Обробка</span><p className="font-medium">{formatDuration(tx.processing_time_seconds)}</p></div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Start Transcription — for uploaded files */}
      {tx.status === "uploaded" && (
        <Card>
          <CardHeader>
            <CardTitle>Запустити транскрипцію</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset selector */}
            {presets.length > 0 && (
              <div className="space-y-2">
                <Label>Пресет (необов'язково)</Label>
                <Select value={selectedPresetId} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть пресет або налаштуйте вручну..." />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPresetId && (() => {
                  const preset = presets.find((p: any) => String(p.id) === selectedPresetId);
                  return preset?.description ? (
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  ) : null;
                })()}
              </div>
            )}

            {/* Settings panel */}
            <TranscriptionSettingsPanel settings={settings} onUpdate={updateSetting} />

            {/* Start button */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleStartTranscription}
              disabled={isStarting}
            >
              {isStarting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Запуск...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Почати транскрипцію</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {tx.status === "completed" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Результат</CardTitle>
              <div className="flex gap-2">
                {artifacts?.textUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={artifacts.textUrl} download><Download className="w-4 h-4 mr-1" /> TXT</a>
                  </Button>
                )}
                {artifacts?.srtUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={artifacts.srtUrl} download><Download className="w-4 h-4 mr-1" /> SRT</a>
                  </Button>
                )}
                {artifacts?.jsonUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={artifacts.jsonUrl} download><Download className="w-4 h-4 mr-1" /> JSON</a>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text">
              <TabsList>
                <TabsTrigger value="text">Текст</TabsTrigger>
                {tx.summary && <TabsTrigger value="summary">Підсумок</TabsTrigger>}
              </TabsList>
              <TabsContent value="text" className="mt-4">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                  {tx.transcript_text || "Завантажте повний текст через кнопку TXT"}
                </div>
              </TabsContent>
              {tx.summary && (
                <TabsContent value="summary" className="mt-4">
                  <div className="prose prose-sm max-w-none bg-muted/30 rounded-lg p-4">
                    {tx.summary}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {tx.status === "failed" && tx.error_message && (
        <Alert variant="destructive">
          <AlertDescription>{tx.error_message}</AlertDescription>
        </Alert>
      )}

      {/* Processing */}
      {tx.status === "transcribing" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">Транскрипція в процесі...</p>
            <p className="text-sm text-muted-foreground mt-1">Сторінка оновиться автоматично</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
