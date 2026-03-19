"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SendHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = 150;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;

    // Visual feedback — brief "sending" flash
    setIsSending(true);
    setTimeout(() => setIsSending(false), 150);

    onSend(trimmed);
    setValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasContent = value.trim().length > 0;

  return (
    <div
      className={cn(
        "flex gap-2 items-end p-3 md:p-4 border-t bg-background w-full max-w-full overflow-hidden",
        "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-4"
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e: any) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Задайте питання..."
        className={cn(
          "flex-1 min-w-0 resize-none rounded-2xl md:rounded-lg border border-input bg-background px-4 py-3 md:py-2 text-base md:text-sm",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "min-h-[44px] md:min-h-[40px] max-h-[150px]",
          "transition-colors",
          (isLoading || disabled) && "opacity-50 cursor-not-allowed"
        )}
        rows={1}
        disabled={isLoading || disabled}
      />
      <Button
        size="icon"
        className={cn(
          "shrink-0 min-w-[44px] min-h-[44px] md:min-w-[36px] md:min-h-[36px] rounded-full md:rounded-lg transition-all",
          isSending && "scale-90",
          hasContent && !isLoading && !disabled
            ? "bg-primary text-primary-foreground shadow-md"
            : ""
        )}
        onClick={handleSubmit}
        disabled={!hasContent || isLoading || disabled}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
        ) : (
          <SendHorizontal className="h-5 w-5 md:h-4 md:w-4" />
        )}
      </Button>
    </div>
  );
}
