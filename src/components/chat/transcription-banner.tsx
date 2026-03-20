"use client";

import { FileText, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TranscriptionBannerProps {
  transcription: {
    id: number;
    original_filename?: string;
    transcript_text?: string;
    word_count?: number;
    status?: string;
  };
  onDismiss: () => void;
}

export function TranscriptionBanner({ transcription, onDismiss }: TranscriptionBannerProps) {
  const filename = transcription.original_filename || `Транскрипція #${transcription.id}`;
  const charCount = transcription.transcript_text
    ? Math.min(transcription.transcript_text.length, 15000)
    : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
          📝 Чат з транскрипцією: {filename}
        </p>
        <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
          {charCount > 0
            ? `${charCount.toLocaleString()} символів контексту`
            : "Завантаження контексту..."}
          {transcription.word_count ? ` · ${transcription.word_count.toLocaleString()} слів` : ""}
        </p>
      </div>
      <Link href={`/transcriptions/${transcription.id}`}>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" title="Відкрити транскрипцію">
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-blue-500"
        onClick={onDismiss}
        title="Закрити контекст"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
