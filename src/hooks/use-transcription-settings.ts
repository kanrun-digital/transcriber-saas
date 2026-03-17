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
    (presetConfig: any) => {
      try {
        const config = typeof presetConfig === "string" ? JSON.parse(presetConfig) : presetConfig;
        const mapped: Partial<TranscriptionSettings> = {};
        if (config.language_code) mapped.language = config.language_code;
        if (config.language) mapped.language = config.language;
        if (config.diarization !== undefined) mapped.enableDiarization = config.diarization;
        if (config.sentence_diarization !== undefined) mapped.sentenceDiarization = config.sentence_diarization;
        if (config.sentence_level_timestamps !== undefined) mapped.sentenceTimestamps = config.sentence_level_timestamps;
        if (config.word_level_timestamps !== undefined) mapped.wordTimestamps = config.word_level_timestamps;
        if (config.srt !== undefined) mapped.srt = config.srt;
        if (config.multichannel !== undefined) mapped.multichannel = config.multichannel;
        if (config.return_as_file !== undefined) mapped.returnAsFile = config.return_as_file;
        if (config.summarize !== undefined) mapped.summarize = config.summarize;
        if (config.translate) mapped.translate = config.translate;
        if (config.custom_prompt) mapped.customPrompt = config.custom_prompt;
        if (config.custom_vocabulary) mapped.customVocabulary = config.custom_vocabulary;
        if (config.llm_translation) mapped.llmTranslation = config.llm_translation;
        if (config.srt_translation) mapped.srtTranslation = config.srt_translation;
        if (config.overall_sentiment !== undefined) mapped.overallSentiment = config.overall_sentiment;
        if (config.overall_classification !== undefined) mapped.overallClassification = config.overall_classification;
        setSettings((prev) => ({ ...prev, ...mapped }));
      } catch {
        // Invalid preset, ignore
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
