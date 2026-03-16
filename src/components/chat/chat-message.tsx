"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import type { RagReference } from "@/types";

interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  references?: RagReference[];
  onReferencesClick?: () => void;
  onSourceClick?: (ref: RagReference) => void;
}

export function ChatMessage({ role, content, references, onReferencesClick, onSourceClick }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn("flex gap-3 py-3 px-4", isUser ? "flex-row-reverse" : "flex-row")}
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
            : "bg-muted"
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {content}
        </div>

        {references && references.length > 0 && (
          <div className="mt-2 pt-2 border-t border-current/10 space-y-1">
            <button
              className="text-xs font-medium opacity-70 hover:opacity-100"
              onClick={onReferencesClick}
            >
              📄 {references.length} джерел(а)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
