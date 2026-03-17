"use client";

import { useState, useCallback, useMemo } from "react";
import {
  FULL_MODE_LANGUAGES,
  LITE_MODE_LANGUAGES,
  DIARIZATION_LANGUAGES,
} from "@/constants/languages";
import { useAuthStore } from "@/stores/auth-store";
import type { SaladMode, TranscriptionSettings } from "@/types";

const DEFAULT_SETTINGS: TranscriptionSettings = {
  language: "uk",
  enableDiarization: true,
  saladMode: "full",
  sentenceTimestamps: true,
  wordTimestamps: false,
  srt: true,
  sentenceDiarization: true,
  multichannel: false,
  returnAsFile: true,
  summarize: 200,
  translate: null,
  customVocabulary: null,
  customPrompt: null,
  llmTranslation: null,
  srtTranslation: null,
  overallSentiment: false,
  overallClassification: false,
};

export function useTranscriptionSettings() {
  const workspace = useAuthStore((s) => s.workspace);
  const defaultMode = (workspace?.default_salad_mode as SaladMode) || "full";

  const [settings, setSettings] = useState<TranscriptionSettings>({
    ...DEFAULT_SETTINGS,
    saladMode: defaultMode,
  });

  const languages = useMemo(
    () =>
      settings.saladMode === "lite"
        ? [...LITE_MODE_LANGUAGES]
        : [...FULL_MODE_LANGUAGES],
    [settings.saladMode]
  );

  const diarizationAvailable = useMemo(
    () =>
      settings.saladMode === "full" &&
      (DIARIZATION_LANGUAGES as readonly string[]).includes(settings.language),
    [settings.saladMode, settings.language]
  );

  const updateSetting = useCallback(
    <K extends keyof TranscriptionSettings>(key: K, value: TranscriptionSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };

        // When switching to lite, force english
        if (key === "saladMode" && value === "lite") {
          next.language = "en";
          next.enableDiarization = false;
          next.summarize = 0;
        }

        // When switching to full, reset language to uk
        if (key === "saladMode" && value === "full") {
          next.language = "uk";
          next.enableDiarization = true;
          next.summarize = 200;
        }

        // Disable diarization if language doesn't support it
        if (key === "language") {
          if (!(DIARIZATION_LANGUAGES as readonly string[]).includes(value as string)) {
            next.enableDiarization = false;
          }
        }

        return next;
      });
    },
    []
  );

  const applyPreset = useCallback(
    (presetSettings: string) => {
      try {
        const parsed = JSON.parse(presetSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Invalid preset JSON, ignore
      }
    },
    []
  );

  const resetToDefaults = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS, saladMode: defaultMode });
  }, [defaultMode]);

  return {
    settings,
    languages,
    diarizationAvailable,
    updateSetting,
    applyPreset,
    resetToDefaults,
  };
}
