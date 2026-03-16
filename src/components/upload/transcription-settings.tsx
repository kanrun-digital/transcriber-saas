"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranscriptionSettings } from "@/hooks/use-transcription-settings";
import type { SaladMode, TranscriptionSettings } from "@/types";

interface TranscriptionSettingsProps {
  settings: TranscriptionSettings;
  languages: { value: string; label: string }[];
  diarizationAvailable: boolean;
  onUpdate: <K extends keyof TranscriptionSettings>(key: K, value: TranscriptionSettings[K]) => void;
}

export function TranscriptionSettingsPanel({
  settings,
  languages,
  diarizationAvailable,
  onUpdate,
}: TranscriptionSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Налаштування транскрипції</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode selector */}
        <div className="space-y-2">
          <Label>Режим</Label>
          <Tabs
            value={settings.saladMode}
            onValueChange={(v) => onUpdate("saladMode", v as SaladMode)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="full" className="flex-1">
                Full
              </TabsTrigger>
              <TabsTrigger value="lite" className="flex-1">
                Lite
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">
            {settings.saladMode === "full"
              ? "Повний режим: 28+ мов, діаризація, резюме"
              : "Швидкий режим: лише англійська, базова транскрипція"}
          </p>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label>Мова</Label>
          <Select
            value={settings.language}
            onValueChange={(v) => onUpdate("language", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Оберіть мову" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Diarization */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Діаризація (розпізнавання спікерів)</Label>
            <p className="text-xs text-muted-foreground">
              {diarizationAvailable
                ? "Доступно для обраної мови"
                : "Недоступно для цієї мови або режиму"}
            </p>
          </div>
          <Switch
            checked={settings.enableDiarization}
            onCheckedChange={(v) => onUpdate("enableDiarization", v)}
            disabled={!diarizationAvailable}
          />
        </div>

        {/* SRT */}
        <div className="flex items-center justify-between">
          <div>
            <Label>SRT субтитри</Label>
            <p className="text-xs text-muted-foreground">Генерувати файл субтитрів</p>
          </div>
          <Switch
            checked={settings.srt}
            onCheckedChange={(v) => onUpdate("srt", v)}
          />
        </div>

        {/* Summarize (full mode only) */}
        {settings.saladMode === "full" && (
          <div className="space-y-2">
            <Label>Резюме (кількість слів)</Label>
            <Select
              value={String(settings.summarize)}
              onValueChange={(v) => onUpdate("summarize", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Вимкнено</SelectItem>
                <SelectItem value="100">~100 слів</SelectItem>
                <SelectItem value="200">~200 слів</SelectItem>
                <SelectItem value="500">~500 слів</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { TranscriptionSettingsPanel as TranscriptionSettingsComponent };
