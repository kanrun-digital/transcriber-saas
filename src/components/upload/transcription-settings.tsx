"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SaladMode, TranscriptionSettings } from "@/types";

interface TranscriptionSettingsProps {
  settings: TranscriptionSettings;
  languages: { value: string; label: string }[];
  diarizationAvailable: boolean;
  onUpdate: <K extends keyof TranscriptionSettings>(
    key: K,
    value: TranscriptionSettings[K]
  ) => void;
}

function SectionToggle({
  label,
  description,
  open,
  onToggle,
  children,
}: {
  label: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg">
      <Button
        variant="ghost"
        className="w-full justify-between px-4 py-3 h-auto"
        onClick={onToggle}
      >
        <div className="text-left">
          <span className="text-sm font-medium">{label}</span>
          {description && (
            <p className="text-xs text-muted-foreground font-normal">
              {description}
            </p>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
      </Button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

export function TranscriptionSettingsPanel({
  settings,
  languages,
  diarizationAvailable,
  onUpdate,
}: TranscriptionSettingsProps) {
  const [outputOpen, setOutputOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Налаштування транскрипції</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ───────── Basic (always visible) ───────── */}

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
              ? "Повний режим: 28+ мов, діаризація, резюме, AI-обробка"
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

        {/* ───────── Output (collapsible, default open) ───────── */}

        <SectionToggle
          label="Вивід"
          description="Формат та структура результату"
          open={outputOpen}
          onToggle={() => setOutputOpen((o) => !o)}
        >
          {/* SRT */}
          <div className="flex items-center justify-between">
            <div>
              <Label>SRT субтитри</Label>
              <p className="text-xs text-muted-foreground">
                Генерувати файл субтитрів
              </p>
            </div>
            <Switch
              checked={settings.srt}
              onCheckedChange={(v) => onUpdate("srt", v)}
            />
          </div>

          {/* Sentence timestamps */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Часові мітки речень</Label>
              <p className="text-xs text-muted-foreground">
                Включити початок/кінець для кожного речення
              </p>
            </div>
            <Switch
              checked={settings.sentenceTimestamps}
              onCheckedChange={(v) => onUpdate("sentenceTimestamps", v)}
            />
          </div>

          {/* Word timestamps */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Часові мітки слів</Label>
              <p className="text-xs text-muted-foreground">
                Включити початок/кінець для кожного слова
              </p>
            </div>
            <Switch
              checked={settings.wordTimestamps}
              onCheckedChange={(v) => onUpdate("wordTimestamps", v)}
            />
          </div>

          {/* Sentence diarization */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Діаризація на рівні речень</Label>
              <p className="text-xs text-muted-foreground">
                Призначити спікера кожному реченню
              </p>
            </div>
            <Switch
              checked={settings.sentenceDiarization}
              onCheckedChange={(v) => onUpdate("sentenceDiarization", v)}
              disabled={!diarizationAvailable}
            />
          </div>

          {/* Multichannel */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Мультиканальний</Label>
              <p className="text-xs text-muted-foreground">
                Обробляти кожен аудіоканал окремо
              </p>
            </div>
            <Switch
              checked={settings.multichannel}
              onCheckedChange={(v) => onUpdate("multichannel", v)}
            />
          </div>

          {/* Return as file */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Повернути як файл</Label>
              <p className="text-xs text-muted-foreground">
                Результат як завантажуваний файл замість JSON
              </p>
            </div>
            <Switch
              checked={settings.returnAsFile}
              onCheckedChange={(v) => onUpdate("returnAsFile", v)}
            />
          </div>
        </SectionToggle>

        {/* ───────── AI Processing (collapsible, Full mode only) ───────── */}

        {settings.saladMode === "full" && (
          <SectionToggle
            label="AI-обробка"
            description="Резюме, переклад, аналіз — тільки Full режим"
            open={aiOpen}
            onToggle={() => setAiOpen((o) => !o)}
          >
            {/* Summarize */}
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
                  <SelectItem value="1000">~1000 слів</SelectItem>
                  <SelectItem value="2000">~2000 слів</SelectItem>
                  <SelectItem value="3000">~3000 слів</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom prompt */}
            <div className="space-y-2">
              <Label>Кастомний промпт</Label>
              <Textarea
                placeholder="Інструкції для AI-обробки транскрипту (наприклад: витягни ключові теми, створи план дій...)"
                value={settings.customPrompt ?? ""}
                onChange={(e) =>
                  onUpdate(
                    "customPrompt",
                    e.target.value || null
                  )
                }
                rows={4}
                className="resize-y"
              />
            </div>

            {/* Custom vocabulary */}
            <div className="space-y-2">
              <Label>Кастомний словник</Label>
              <Textarea
                placeholder="Спеціальні терміни, імена, абревіатури (по одному на рядок або через кому)"
                value={settings.customVocabulary ?? ""}
                onChange={(e) =>
                  onUpdate(
                    "customVocabulary",
                    e.target.value || null
                  )
                }
                rows={3}
                className="resize-y"
              />
            </div>

            {/* Translate to English */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Переклад на англійську</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматично перекласти транскрипт англійською
                </p>
              </div>
              <Switch
                checked={settings.translate === "en"}
                onCheckedChange={(v) =>
                  onUpdate("translate", v ? "en" : null)
                }
              />
            </div>

            {/* LLM Translation */}
            <div className="space-y-2">
              <Label>LLM переклад</Label>
              <Input
                placeholder="uk, de, fr (мови через кому)"
                value={settings.llmTranslation ?? ""}
                onChange={(e) =>
                  onUpdate(
                    "llmTranslation",
                    e.target.value || null
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Переклад транскрипту через LLM на вказані мови
              </p>
            </div>

            {/* SRT Translation */}
            <div className="space-y-2">
              <Label>SRT переклад</Label>
              <Input
                placeholder="uk, de, fr (мови через кому)"
                value={settings.srtTranslation ?? ""}
                onChange={(e) =>
                  onUpdate(
                    "srtTranslation",
                    e.target.value || null
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Генерувати перекладені SRT-файли для вказаних мов
              </p>
            </div>

            {/* Sentiment analysis */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Аналіз тональності</Label>
                <p className="text-xs text-muted-foreground">
                  Визначити загальний настрій тексту
                </p>
              </div>
              <Switch
                checked={settings.overallSentiment}
                onCheckedChange={(v) => onUpdate("overallSentiment", v)}
              />
            </div>

            {/* Classification */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Класифікація</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматична класифікація контенту
                </p>
              </div>
              <Switch
                checked={settings.overallClassification}
                onCheckedChange={(v) =>
                  onUpdate("overallClassification", v)
                }
              />
            </div>
          </SectionToggle>
        )}
      </CardContent>
    </Card>
  );
}

export { TranscriptionSettingsPanel as TranscriptionSettingsComponent };
