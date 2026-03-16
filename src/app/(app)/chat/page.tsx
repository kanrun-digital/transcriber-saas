"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat";
import { useWorkspace } from "@/hooks/use-workspace";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { SourcesPanel } from "@/components/chat/sources-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: any[];
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const transcriptionId = searchParams.get("transcription");
  const { workspace } = useWorkspace();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [selectedRefs, setSelectedRefs] = useState<any[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const queryMutation = useMutation({
    mutationFn: (question: string) =>
      chatService.queryRag({
        workspaceId: workspace!.id,
        question,
        conversationId: conversationId || undefined,
        ragBaseId: transcriptionId ? Number(transcriptionId) : undefined,
      }),
    onSuccess: (data, question) => {
      setMessages(prev => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content: data.answer, references: data.references },
      ]);
      if (data.conversationId) setConversationId(data.conversationId);
    },
  });

  const handleSend = (question: string) => {
    setMessages(prev => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: question },
    ]);
    queryMutation.mutate(question);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold">AI Чат</h2>
              <p className="text-muted-foreground max-w-md mt-2">
                Задайте питання по вашим транскрипціям. AI знайде відповідь з точними таймкодами.
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                references={msg.references}
                onReferencesClick={msg.references?.length ? () => setSelectedRefs(msg.references!) : undefined}
              />
            ))
          )}
          {queryMutation.isPending && (
            <div className="flex items-center gap-2 text-muted-foreground px-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm">AI думає...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSend={handleSend} disabled={queryMutation.isPending || !workspace} />
      </div>

      {/* Sources panel */}
      {selectedRefs && (
        <SourcesPanel references={selectedRefs} onClose={() => setSelectedRefs(null)} />
      )}
    </div>
  );
}
