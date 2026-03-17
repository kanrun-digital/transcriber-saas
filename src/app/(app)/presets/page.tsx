"use client";

import { useState, useEffect } from "react";
import { usePresets, useCreatePreset, useDeletePreset } from "@/hooks/use-presets";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as presetsService from "@/services/presets";
import { PresetCard } from "@/components/presets/preset-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Globe, User, FileText, Zap, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { PRESET_CATEGORIES, FULL_MODE_LANGUAGES } from "@/constants/languages";
import type { Preset } from "@/types";

interface PresetFormData {
  title: string;
  description: string;
  category: string;
  transcription_type: "full" | "lite";
  language: string;
  diarization: boolean;
  sentenceDiarization: boolean;
  numSpeakers: number;
  srt: boolean;
  sentenceTimestamps: boolean;
  wordTimestamps: boolean;
  multichannel: boolean;
  returnAsFile: boolean;
  summarize: number;
  translate: string;
  llmTranslation: string;
  srtTranslation: string;
  overallSentiment: boolean;
  overallClassification: boolean;
  customPrompt: string;
  customVocabulary: string;
  is_active: number;
}

const defaultForm: PresetFormData = {
  title: "",
  description: "",
  category: "business",
  transcription_type: "full",
  language: "uk",
  diarization: true,
  sentenceDiarization: true,
  numSpeakers: 2,
  srt: true,
  sentenceTimestamps: true,
  wordTimestamps: false,
  multichannel: false,
  returnAsFile: true,
  summarize: 200,
  translate: "",
  llmTranslation: "",
  srtTranslation: "",
  overallSentiment: false,
  overallClassification: false,
  customPrompt: "",
  customVocabulary: "",
  is_active: 0,
};

function presetToForm(preset: Preset): PresetFormData {
  let config: any = {};
  try {
    config = typeof preset.config_json === "string"
      ? JSON.parse(preset.config_json) : (preset.config_json || {});
  } catch {}
  return {
    title: preset.title,
    description: preset.description || "",
    category: preset.category || "business",
    transcription_type: preset.transcription_type || "full",
    language: config.language_code || config.language || "uk",
    diarization: config.diarization ?? true,
    sentenceDiarization: config.sentence_diarization ?? true,
    numSpeakers: config.numSpeakers ?? 2,
    srt: config.srt ?? true,
    sentenceTimestamps: config.sentence_level_timestamps ?? true,
    wordTimestamps: config.word_level_timestamps ?? false,
    multichannel: config.multichannel ?? false,
    returnAsFile: config.return_as_file ?? true,
    summarize: config.summarize ?? 0,
    translate: config.translate || "",
    llmTranslation: config.llm_translation || "",
    srtTranslation: config.srt_translation || "",
    overallSentiment: config.overall_sentiment ?? false,
    overallClassification: config.overall_classification ?? false,
    customPrompt: config.custom_prompt || "",
    customVocabulary: config.custom_vocabulary || "",
    is_active: preset.is_active,
  };
}

function formToPayload(form: PresetFormData) {
  const config: any = {
    language_code: form.language,
    diarization: form.diarization,
    sentence_diarization: form.sentenceDiarization,
    numSpeakers: form.numSpeakers,
    srt: form.srt,
    sentence_level_timestamps: form.sentenceTimestamps,
    word_level_timestamps: form.wordTimestamps,
    multichannel: form.multichannel,
    return_as_file: form.returnAsFile,
  };
  if (form.summarize > 0) config.summarize = form.summarize;
  if (form.translate) config.translate = form.translate;
  if (form.llmTranslation) config.llm_translation = form.llmTranslation;
  if (form.srtTranslation) config.srt_translation = form.srtTranslation;
  if (form.overallSentiment) config.overall_sentiment = true;
  if (form.overallClassification) config.overall_classification = true;
  if (form.customPrompt.trim()) config.custom_prompt = form.customPrompt.trim();
  if (form.customVocabulary.trim()) config.custom_vocabulary = form.customVocabulary.trim();

  return {
    title: form.title,
    description: form.description || undefined,
    category: form.category,
    transcription_type: form.transcription_type,
    config_json: JSON.stringify(config),
    is_active: form.is_active,
  };
}

// ============ Collapsible Section ============

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border rounded-lg">
      <button type="button" className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium"
        onClick={() => setOpen(!open)}>
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

// ============ Preset Form Dialog ============

function PresetFormDialog({
  open,
  onClose,
  preset,
  onSave,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  preset: Preset | null;
  onSave: (data: PresetFormData) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<PresetFormData>(preset ? presetToForm(preset) : defaultForm);

  // Reset form when preset changes
  useEffect(() => {
    setForm(preset ? presetToForm(preset) : defaultForm);
  }, [preset]);

  const update = <K extends keyof PresetFormData>(key: K, value: PresetFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isEditing = !!preset;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Редагувати пресет" : "Новий пресет"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Змініть налаштування пресету" : "Створіть новий набір налаштувань транскрипції"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic info */}
          <div className="space-y-2">
            <Label>Назва *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Інтерв'ю UA" />
          </div>

          <div className="space-y-2">
            <Label>Опис</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)}
              placeholder="Для транскрипції інтерв'ю українською" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Категорія</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESET_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Режим</Label>
              <Select value={form.transcription_type} onValueChange={(v) => update("transcription_type", v as "full" | "lite")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full (всі мови)</SelectItem>
                  <SelectItem value="lite">Lite (English)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Мова</Label>
              <Select value={form.language} onValueChange={(v) => update("language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FULL_MODE_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>К-ть спікерів</Label>
              <Input type="number" min={1} max={20} value={form.numSpeakers}
                onChange={(e) => update("numSpeakers", Number(e.target.value))} />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Діаризація (розділення спікерів)</Label>
              <Switch checked={form.diarization} onCheckedChange={(v) => update("diarization", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Діаризація по реченнях</Label>
              <Switch checked={form.sentenceDiarization} onCheckedChange={(v) => update("sentenceDiarization", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>SRT субтитри</Label>
              <Switch checked={form.srt} onCheckedChange={(v) => update("srt", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>За замовчуванням</Label>
              <Switch checked={form.is_active === 1} onCheckedChange={(v) => update("is_active", v ? 1 : 0)} />
            </div>
          </div>

          {/* Custom Prompt — MAIN FEATURE */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Custom Prompt</Label>
            <Textarea
              value={form.customPrompt}
              onChange={(e) => update("customPrompt", e.target.value)}
              placeholder="Інструкції для AI обробки транскрипції. Наприклад: Створіть show notes з таймкодами та ключовими тезами..."
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Промпт передається в Salad AI для постобробки тексту. Підтримує форматування, структуру, інструкції.
            </p>
          </div>

          {/* Output section */}
          <Section title="Вивід (Output)" defaultOpen={false}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Часові мітки речень</Label>
                <Switch checked={form.sentenceTimestamps} onCheckedChange={(v) => update("sentenceTimestamps", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Часові мітки слів</Label>
                <Switch checked={form.wordTimestamps} onCheckedChange={(v) => update("wordTimestamps", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Мультиканальний аудіо</Label>
                <Switch checked={form.multichannel} onCheckedChange={(v) => update("multichannel", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Повернути як файл</Label>
                <Switch checked={form.returnAsFile} onCheckedChange={(v) => update("returnAsFile", v)} />
              </div>
              <div className="space-y-2">
                <Label>Summarize (кількість слів)</Label>
                <Select value={String(form.summarize)} onValueChange={(v) => update("summarize", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Без резюме</SelectItem>
                    <SelectItem value="80">~80 слів</SelectItem>
                    <SelectItem value="120">~120 слів</SelectItem>
                    <SelectItem value="200">~200 слів</SelectItem>
                    <SelectItem value="500">~500 слів</SelectItem>
                    <SelectItem value="1000">~1000 слів</SelectItem>
                    <SelectItem value="2000">~2000 слів</SelectItem>
                    <SelectItem value="3000">~3000 слів</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {/* AI Processing */}
          {form.transcription_type === "full" && (
            <Section title="AI-обробка" defaultOpen={false}>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Переклад тексту</Label>
                  <Select value={form.translate || "none"} onValueChange={(v) => update("translate", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без перекладу</SelectItem>
                      <SelectItem value="to_eng">На англійську</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>LLM переклад (мови через кому)</Label>
                  <Input value={form.llmTranslation} onChange={(e) => update("llmTranslation", e.target.value)}
                    placeholder="english, french, german, spanish" />
                </div>
                <div className="space-y-2">
                  <Label>SRT переклад (мови через кому)</Label>
                  <Input value={form.srtTranslation} onChange={(e) => update("srtTranslation", e.target.value)}
                    placeholder="english, french, german" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Визначення настрою</Label>
                  <Switch checked={form.overallSentiment} onCheckedChange={(v) => update("overallSentiment", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Класифікація контенту</Label>
                  <Switch checked={form.overallClassification} onCheckedChange={(v) => update("overallClassification", v)} />
                </div>
                <div className="space-y-2">
                  <Label>Custom Vocabulary</Label>
                  <Input value={form.customVocabulary} onChange={(e) => update("customVocabulary", e.target.value)}
                    placeholder="Технічні терміни через кому" />
                </div>
              </div>
            </Section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Скасувати</Button>
          <Button onClick={() => onSave(form)} disabled={isSaving || !form.title.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Зберегти" : "Створити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main Presets Page ============

export default function PresetsPage() {
  const { data, isLoading } = usePresets();
  const createPreset = useCreatePreset();
  const deletePreset = useDeletePreset();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editPreset, setEditPreset] = useState<Preset | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Preset | null>(null);

  const updatePresetMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => presetsService.updatePreset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
      toast.success("Пресет оновлено");
      setEditPreset(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const presets = data?.data || [];
  const publicPresets = presets.filter((p) => p.is_public === 1);
  const myPresets = presets.filter((p) => p.is_public !== 1);

  const handleCreate = (form: PresetFormData) => {
    createPreset.mutate(formToPayload(form) as any, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleEdit = (form: PresetFormData) => {
    if (!editPreset) return;
    updatePresetMut.mutate({ id: editPreset.id, data: formToPayload(form) });
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deletePreset.mutate(deleteConfirm.id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Пресети</h1>
          <p className="text-muted-foreground">Збережені налаштування транскрипції</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Новий пресет
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Публічні", value: publicPresets.length, icon: Globe },
          { label: "Мої", value: myPresets.length, icon: User },
          { label: "Full", value: presets.filter((p) => p.transcription_type === "full").length, icon: FileText },
          { label: "Lite", value: presets.filter((p) => p.transcription_type === "lite").length, icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3"><p className="text-2xl font-bold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">Мої ({myPresets.length})</TabsTrigger>
          <TabsTrigger value="public">Публічні ({publicPresets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : myPresets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">У вас ще немає пресетів</p>
                <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> Створити перший</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPresets.map((p) => (
                <PresetCard
                  key={p.id}
                  preset={p}
                  onSelect={(preset) => setEditPreset(preset)}
                  onDelete={(id) => setDeleteConfirm(presets.find((x) => x.id === id) || null)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : publicPresets.length === 0 ? (
            <p className="text-muted-foreground">Публічних пресетів немає</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicPresets.map((p) => (
                <PresetCard key={p.id} preset={p} onSelect={(preset) => setEditPreset(preset)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <PresetFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        preset={null}
        onSave={handleCreate}
        isSaving={createPreset.isPending}
      />

      {/* Edit Dialog */}
      <PresetFormDialog
        open={!!editPreset}
        onClose={() => setEditPreset(null)}
        preset={editPreset}
        onSave={handleEdit}
        isSaving={updatePresetMut.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити пресет?</DialogTitle>
            <DialogDescription>
              Ви впевнені що хочете видалити пресет <strong>{deleteConfirm?.title}</strong>? Цю дію не можна скасувати.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePreset.isPending}>
              {deletePreset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
