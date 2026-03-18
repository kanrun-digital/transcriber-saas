"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Brain, FileText, Loader2, Plus, Trash2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { apiPost, apiGet } from "@/services/api-client";
import { API_ROUTES } from "@/constants/routes";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: any[];
}

type ChatMode = "chat" | "rag";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const transcriptionParam = searchParams.get("transcription");
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [mode, setMode] = useState<ChatMode>(transcriptionParam ? "rag" : "chat");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    } catch (err) {
      toast.error("Помилка завантаження чату");
    }
  };

  // Delete conversation
  const deleteConversation = async (convId: number) => {
    try {
      await fetch(`/api/data/conversations/${convId}`, { method: "DELETE", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (conversationId === convId) {
        handleNewChat();
      }
      toast.success("Чат видалено");
    } catch {
      toast.error("Помилка видалення");
    }
  };

  // Chat mutation
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
        workspaceId: workspace!.id,
        question,
        conversationId: conversationId || undefined,
        model: selectedModel,
        transcriptionId: transcriptionParam ? Number(transcriptionParam) : undefined,
      }),
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content: data.answer, references: data.references },
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
      chatMutation.mutate(message);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r flex flex-col bg-muted/30">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-semibold">Історія чатів</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewChat}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarOpen(false)}>
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">Немає чатів</p>
            ) : (
              conversations.filter((c) => !(c as any).deleted_at).map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm ${conversationId === conv.id ? "bg-muted" : ""}`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{conv.title || `Чат #${conv.id}`}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatDate(conv.created_at)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
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
              {mode === "rag" ? "RAG Чат" : "AI Чат"}
            </h1>
            {userCoins > 0 && (
              <Badge variant="outline" className="text-xs">
                {Math.round(userCoins)} coins
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button variant={mode === "chat" ? "default" : "outline"} size="sm" onClick={() => setMode("chat")}>
                <Brain className="w-4 h-4 mr-1" /> Чат
              </Button>
              <Button variant={mode === "rag" ? "default" : "outline"} size="sm" onClick={() => setMode("rag")}>
                <FileText className="w-4 h-4 mr-1" /> RAG
              </Button>
            </div>

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
        <ChatInput onSend={handleSend} isLoading={isLoading} disabled={!workspace} />
      </div>
    </div>
  );
}
