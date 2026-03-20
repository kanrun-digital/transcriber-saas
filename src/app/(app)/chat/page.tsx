"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { TranscriptionBanner } from "@/components/chat/transcription-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Brain, FileText, Loader2, PanelLeftOpen } from "lucide-react";
import { apiPost, apiGet } from "@/services/api-client";
import { API_ROUTES } from "@/constants/routes";
import { toast } from "sonner";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: any[];
}

type ChatMode = "chat" | "rag" | "transcription";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  metadata_json?: string | null;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const transcriptionParam = searchParams.get("transcription");
  const transcriptionIdParam = searchParams.get("transcriptionId");
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Determine initial transcription ID from either param format
  const initialTranscriptionId = transcriptionIdParam || transcriptionParam || "";

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [mode, setMode] = useState<ChatMode>(
    initialTranscriptionId ? "transcription" : "chat"
  );
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTranscription, setSelectedTranscription] = useState<string>(
    initialTranscriptionId
  );
  const [activeTranscriptionId, setActiveTranscriptionId] = useState<string>(
    initialTranscriptionId
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations list
  const conversationsQuery = useQuery({
    queryKey: ["conversations", workspace?.id],
    queryFn: () => apiGet<{ data: Conversation[] }>(API_ROUTES.DATA("conversations"), {
      workspace_id: workspace?.id,
      sort: "updated_at",
      order: "desc",
      limit: 50,
    }),
    enabled: !!workspace?.id,
    staleTime: 30_000,
  });

  const conversations = conversationsQuery.data?.data || [];

  // Load transcription details when in transcription mode
  const transcriptionQuery = useQuery({
    queryKey: ["transcription-for-chat", activeTranscriptionId],
    queryFn: () => apiGet<any>(API_ROUTES.DATA_RECORD("transcriptions", activeTranscriptionId)),
    enabled: !!activeTranscriptionId && mode === "transcription",
    staleTime: 60_000,
  });

  const transcriptionData = transcriptionQuery.data;

  // Load indexed transcriptions for RAG mode
  const indexedTxQuery = useQuery({
    queryKey: ["indexed-transcriptions", workspace?.id],
    queryFn: () => apiGet<{ data: any[] }>(API_ROUTES.DATA("transcriptions"), {
      workspace_id: workspace?.id,
      status: "completed",
      limit: 50,
    }),
    enabled: !!workspace?.id,
    staleTime: 30_000,
  });
  const indexedTranscriptions = (indexedTxQuery.data?.data || []).filter(
    (t: any) => !t.deleted_at && t.rag_status === "synced"
  );

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

  // Load conversation messages
  const loadConversation = async (convId: number) => {
    setConversationId(convId);
    setMessages([]);
    try {
      const res = await apiGet<{ data: any[] }>(API_ROUTES.DATA("messages"), {
        conversation_id: convId,
        sort: "created_at",
        order: "asc",
        limit: 200,
      });
      const msgs: LocalMessage[] = (res.data || []).map((m: any) => ({
        id: `msg-${m.id}`,
        role: m.role as "user" | "assistant",
        content: m.content_text || m.content || "",
      }));
      setMessages(msgs);

      // Detect conversation type from metadata
      const conv = conversations.find((c: any) => c.id === convId);
      if (conv?.metadata_json) {
        try {
          const meta = typeof conv.metadata_json === "string"
            ? JSON.parse(conv.metadata_json)
            : conv.metadata_json;
          if (meta.chat_type === "transcription" && meta.transcription_id) {
            setMode("transcription");
            setActiveTranscriptionId(String(meta.transcription_id));
          } else if (meta.chat_type === "rag") {
            setMode("rag");
          } else {
            setMode("chat");
            setActiveTranscriptionId("");
          }
        } catch {
          setMode("chat");
        }
      }
    } catch (err) {
      toast.error("Помилка завантаження чату");
    }
  };

  // Delete conversation
  const deleteConversation = async (convId: number) => {
    try {
      await fetch(`/api/data/conversations/${convId}`, {
        method: "DELETE",
        credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (conversationId === convId) {
        handleNewChat();
      }
      toast.success("Чат видалено");
    } catch {
      toast.error("Помилка видалення");
    }
  };

  // Chat mutation (simple + transcription mode)
  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      apiPost<{
        answer: string;
        conversationId: number;
        coinsUsed: number;
        transcriptionTitle?: string;
      }>("/api/chat", {
        workspaceId: workspace?.id,
        message,
        conversationId: conversationId || undefined,
        model: selectedModel,
        transcriptionId: mode === "transcription" && activeTranscriptionId
          ? Number(activeTranscriptionId)
          : undefined,
      }),
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content: data.answer },
      ]);
      if (data.conversationId) {
        setConversationId(data.conversationId);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    },
    onError: (err: any) => toast.error(err.message || "Помилка чату"),
  });

  // RAG mutation
  const ragMutation = useMutation({
    mutationFn: (question: string) =>
      apiPost<{ answer: string; references: any[]; conversationId: number }>("/api/rag/query", {
        workspaceId: workspace?.id,
        question,
        conversationId: conversationId || undefined,
        model: selectedModel,
        transcriptionId: selectedTranscription ? Number(selectedTranscription) : undefined,
      }),
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          references: data.references,
        },
      ]);
      if (data.conversationId) {
        setConversationId(data.conversationId);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
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
      // Both "chat" and "transcription" mode use /api/chat
      chatMutation.mutate(message);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setActiveTranscriptionId("");
    setMode("chat");
  };

  const handleModeChange = (newMode: ChatMode) => {
    setMode(newMode);
    if (newMode !== "transcription") {
      setActiveTranscriptionId("");
    }
  };

  // Helper to get chat type from conversation metadata
  const getConversationMeta = (conv: Conversation) => {
    if (!conv.metadata_json) return { chatType: "simple" as const, transcriptionId: null };
    try {
      const meta = typeof conv.metadata_json === "string"
        ? JSON.parse(conv.metadata_json)
        : conv.metadata_json;
      return {
        chatType: (meta.chat_type || "simple") as "simple" | "transcription" | "rag",
        transcriptionId: meta.transcription_id || null,
      };
    } catch {
      return { chatType: "simple" as const, transcriptionId: null };
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <ChatSidebar
          conversations={conversations.filter((c: any) => !c.deleted_at)}
          activeConversationId={conversationId}
          onSelectConversation={loadConversation}
          onDeleteConversation={deleteConversation}
          onNewChat={handleNewChat}
          onClose={() => setSidebarOpen(false)}
          getConversationMeta={getConversationMeta}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            )}
            <MessageSquare className="w-5 h-5" />
            <h1 className="text-lg font-semibold">
              {mode === "rag" ? "RAG Чат" : mode === "transcription" ? "Чат з транскрипцією" : "AI Чат"}
            </h1>
            {userCoins > 0 && (
              <Badge variant="outline" className="text-xs">
                {Math.round(userCoins)} coins
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              <Button
                variant={mode === "chat" ? "default" : "outline"}
                size="sm"
                onClick={() => handleModeChange("chat")}
              >
                <Brain className="w-4 h-4 mr-1" /> Чат
              </Button>
              <Button
                variant={mode === "transcription" ? "default" : "outline"}
                size="sm"
                onClick={() => handleModeChange("transcription")}
              >
                <FileText className="w-4 h-4 mr-1" /> Транскрипція
              </Button>
              <Button
                variant={mode === "rag" ? "default" : "outline"}
                size="sm"
                onClick={() => handleModeChange("rag")}
              >
                <Brain className="w-4 h-4 mr-1" /> RAG
              </Button>
            </div>

            {/* Transcription selector for transcription mode */}
            {mode === "transcription" && (
              <Select
                value={activeTranscriptionId}
                onValueChange={setActiveTranscriptionId}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Оберіть транскрипцію..." />
                </SelectTrigger>
                <SelectContent>
                  {(indexedTxQuery.data?.data || [])
                    .filter((t: any) => !t.deleted_at && t.status === "completed")
                    .map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.original_filename || `#${t.id}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            {/* RAG Transcription selector */}
            {mode === "rag" && indexedTranscriptions.length > 0 && (
              <Select value={selectedTranscription} onValueChange={setSelectedTranscription}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Транскрипція..." />
                </SelectTrigger>
                <SelectContent>
                  {indexedTranscriptions.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.original_filename || `#${t.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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

        {/* Transcription context banner */}
        {mode === "transcription" && activeTranscriptionId && transcriptionData && (
          <TranscriptionBanner
            transcription={transcriptionData}
            onDismiss={() => {
              setActiveTranscriptionId("");
              setMode("chat");
            }}
          />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">
                {mode === "rag"
                  ? "Задайте питання по транскрипціям"
                  : mode === "transcription"
                  ? "Задайте питання по транскрипції"
                  : "Почніть розмову з AI"}
              </p>
              <p className="text-sm mt-1">
                {mode === "rag"
                  ? "AI відповість на основі ваших транскрипцій (RAG)"
                  : mode === "transcription"
                  ? activeTranscriptionId
                    ? `Контекст: ${transcriptionData?.original_filename || "завантаження..."}`
                    : "Оберіть транскрипцію вгорі"
                  : `Модель: ${chatModels.find((m: any) => (m.id || m.model) === selectedModel)?.name || selectedModel}`}
              </p>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} references={msg.references} />
              ))}
              {isLoading && (
                <div className="flex gap-3 py-3 px-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-muted">Думаю...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="w-full">
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            disabled={!workspace || (mode === "transcription" && !activeTranscriptionId)}
          />
        </div>
      </div>
    </div>
  );
}
