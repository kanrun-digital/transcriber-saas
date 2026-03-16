"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDuration } from "@/lib/utils";
import type { RagReference } from "@/types";

interface SourcesPanelProps {
  references: RagReference[];
  onSourceClick?: (ref: RagReference) => void;
}

export function SourcesPanel({ references, onSourceClick }: SourcesPanelProps) {
  if (references.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Джерела</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Задайте питання, щоб побачити джерела відповідей
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Джерела ({references.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 p-4">
            {references.map((ref, i) => (
              <button
                key={i}
                className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                onClick={() => onSourceClick?.(ref)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">
                    📄 {ref.file_name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {formatDuration(ref.start_seconds)} — {formatDuration(ref.end_seconds)}
                  </span>
                </div>
                {ref.speaker && (
                  <p className="text-xs text-muted-foreground mb-1">
                    🎤 {ref.speaker}
                  </p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {ref.excerpt}
                </p>
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground">
                    Релевантність: {Math.round(ref.relevance_score * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
