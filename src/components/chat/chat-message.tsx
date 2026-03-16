"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import type { Message, RagReference } from "@/types";

interface ChatMessageProps {
  message: Message;
  onSourceClick?: (ref: RagReference) => void;
}

export function ChatMessage({ message, onSourceClick }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.is_error === 1;

  let references: RagReference[] = [];
  if (message.rag_references_json) {
    try {
      references = JSON.parse(message.rag_references_json);
    } catch {
      // invalid JSON
    }
  }

  return (
    <div
      className={cn("flex gap-3 py-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : isError
              ? "bg-destructive/10 border border-destructive/20"
              : "bg-muted"
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content_text || ""}
        </div>

        {references.length > 0 && (
          <div className="mt-2 pt-2 border-t border-current/10 space-y-1">
            <p className="text-xs font-medium opacity-70">Джерела:</p>
            {references.map((ref, i) => (
              <button
                key={i}
                className="block text-xs underline opacity-70 hover:opacity-100 text-left"
                onClick={() => onSourceClick?.(ref)}
              >
                📄 {ref.file_name} ({Math.floor(ref.start_seconds / 60)}:{String(Math.floor(ref.start_seconds % 60)).padStart(2, "0")} - {Math.floor(ref.end_seconds / 60)}:{String(Math.floor(ref.end_seconds % 60)).padStart(2, "0")})
                {ref.speaker && ` — ${ref.speaker}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
