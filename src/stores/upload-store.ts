"use client";

import { create } from "zustand";
import type { UploadPhase } from "@/types";

interface UploadStoreState {
  phase: UploadPhase;
  progress: number;
  file: File | null;
  transcriptionId: number | null;
  error: string | null;
  abortFn: (() => void) | null;

  setPhase: (phase: UploadPhase) => void;
  setProgress: (progress: number) => void;
  setFile: (file: File | null) => void;
  setTranscriptionId: (id: number | null) => void;
  setError: (error: string | null) => void;
  setAbortFn: (fn: (() => void) | null) => void;
  reset: () => void;
}

const initialState = {
  phase: "idle" as UploadPhase,
  progress: 0,
  file: null as File | null,
  transcriptionId: null as number | null,
  error: null as string | null,
  abortFn: null as (() => void) | null,
};

export const useUploadStore = create<UploadStoreState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
  setFile: (file) => set({ file }),
  setTranscriptionId: (id) => set({ transcriptionId: id }),
  setError: (error) => set({ error, phase: error ? "error" : "idle" }),
  setAbortFn: (fn) => set({ abortFn: fn }),
  reset: () => set({ ...initialState }),
}));
