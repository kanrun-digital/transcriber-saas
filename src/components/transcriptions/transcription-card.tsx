"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { ROUTES } from "@/constants/routes";
import { formatBytes, formatDuration, formatDate, truncate } from "@/lib/utils";
import type { Transcription } from "@/types";

interface TranscriptionCardProps {
  transcription: Transcription;
}

export function TranscriptionCard({ transcription: tx }: TranscriptionCardProps) {
  return (
    <Link href={ROUTES.TRANSCRIPTION_DETAIL(tx.id)}>
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium truncate">
              {tx.original_filename || "Без назви"}
            </p>
            <StatusBadge status={tx.status} ragStatus={tx.rag_status} />
          </div>

          {tx.transcript_text && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {truncate(tx.transcript_text, 150)}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {tx.salad_mode === "lite" ? "Lite" : "Full"}
            </Badge>
            {tx.language && (
              <span className="uppercase">{tx.language}</span>
            )}
            <span>{formatBytes(tx.file_size_bytes)}</span>
            {tx.duration_seconds && (
              <span>{formatDuration(tx.duration_seconds)}</span>
            )}
            <span className="ml-auto">{formatDate(tx.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
