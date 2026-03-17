"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Brain, FileText, Loader2 } from "lucide-react";
import { apiPost, apiGet } from "@/services/api-client";
import { toast } from "sonner";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: any[];
}

type ChatMode = "chat" | "rag";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const transcriptionParam = searchParams.get("transcription");
  const { workspace } = useWorkspace();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [mode, setMode] = useState<ChatMode>(transcriptionParam ? "rag" : "chat");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load available models
  const modelsQuery = useQuery({
    queryKey: ["models", workspace?.id],
    queryFn: () => apiGet<{ chat: any[]; image: any[]; userCoins: number }>("/api/models", {
      workspaceId: workspace?.id,
      type: "chat",
    }),
    enabled: !!workspace?.id,
    staleTime: 60 * 60 * 1000,
  });

  const chatModels = modelsQuery.data?.chat || [];
  const userCoins = modelsQuery.data?.userCoins || 0;

  // Chat mutation (simple chat)
  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      apiPost<{ answer: string; conversationId: number; coinsUsed: number }>("/api/chat", {
        workspaceId: workspace!.id,
        message,
        conversationId: conversationId || undefined,
        model: selectedModel,
      }),
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content: data.answer },
      ]);
      if (data.conversationId) setConversationId(data.conversationId);
    },
    onError: (err: any) => toast.error(err.message || "Помилка чату"),
  });

  // RAG mutation
  const ragMutation = useMutation({
    mutationFn: (question: string) =>
      apiPost<{ answer: string; references: any[]; conversationId: number }>("/api/rag/query", {
        workspaceId: workspace!.id,
        question,
        conversationId: conversationId || undefined,
        model: selectedModel,
        ragBaseId: transcriptionParam ? Number(transcriptionParam) : undefined,
      }),
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content: data.answer, references: data.references },
      ]);
      if (data.conversationId) setConversationId(data.conversationId);
    },
    onError: (err: any) => toast.error(err.message || "Помилка RAG"),
  });

  const isLoading = chatMutation.isPending || ragMutation.isPending;

  const handleSend = (message: string) => {
    setMessages(prev => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: message },
    ]);

    if (mode === "rag") {
      ragMutation.mutate(message);
    } else {
      chatMutation.mutate(message);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5" />
          <h1 className="text-lg font-semibold">
            {mode === "rag" ? "RAG Чат" : "AI Чат"}
          </h1>
          {userCoins > 0 && (
            <Badge variant="outline" className="text-xs">
              {Math.round(userCoins)} coins
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex gap-1">
            <Button
              variant={mode === "chat" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("chat")}
            >
              <Brain className="w-4 h-4 mr-1" /> Чат
            </Button>
            <Button
              variant={mode === "rag" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("rag")}
            >
              <FileText className="w-4 h-4 mr-1" /> RAG
            </Button>
          </div>

          {/* Model Selector */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Модель..." />
            </SelectTrigger>
            <SelectContent>
              {chatModels.length > 0 ? (
                chatModels.map((m: any) => (
                  <SelectItem key={m.id || m.model} value={m.id || m.model}>
                    {m.name} ({m.pricing?.coins || "?"} coins)
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="openai/gpt-4o-mini" disabled>
                  {modelsQuery.isLoading ? "Завантаження..." : "Немає моделей"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleNewChat}>
            Новий чат
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">
              {mode === "rag" ? "Задайте питання по транскрипціям" : "Почніть розмову з AI"}
            </p>
            <p className="text-sm mt-1">
              {mode === "rag"
                ? "AI відповість на основі ваших транскрипцій"
                : `Модель: ${chatModels.find((m: any) => (m.id || m.model) === selectedModel)?.name || selectedModel}`
              }
            </p>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                references={msg.references}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 py-3 px-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-muted">
                  Думаю...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        disabled={!workspace}
      />
    </div>
  );
}
