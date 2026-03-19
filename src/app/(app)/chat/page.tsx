"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare, Brain, FileText, Loader2, Plus, Trash2,
  PanelLeftClose, PanelLeftOpen, X, ChevronDown, ArrowLeft,
} from "lucide-react";
import { apiPost, apiGet } from "@/services/api-client";
import { API_ROUTES } from "@/constants/routes";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const transcriptionParam = searchParams.get("transcription");
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [mode, setMode] = useState<ChatMode>(transcriptionParam ? "rag" : "chat");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [sidebarOpen, setSidebarOpen] = useState(false); // closed by default on mobile
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [selectedTranscription, setSelectedTranscription] = useState<string>(transcriptionParam || "");
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [ragSelectorOpen, setRagSelectorOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations list
  const conversationsQuery = useQuery({
    queryKey: ["conversations", workspace?.id],
    queryFn: () => apiGet<{ data: Conversation[] }>(API_ROUTES.DATA("conversations"), {
      workspace_id: workspace?.id || 0,
      sort: "updated_at",
      order: "desc",
      limit: 50,
    }),
    enabled: !!(workspace?.id),
    staleTime: 30_000,
  });

  const conversations = conversationsQuery.data?.data || [];

  // Load indexed transcriptions for RAG mode
  const indexedTxQuery = useQuery({
    queryKey: ["indexed-transcriptions", workspace?.id],
    queryFn: () => apiGet<{ data: any[] }>(API_ROUTES.DATA("transcriptions"), {
      workspace_id: workspace?.id || 0,
      status: "completed",
      limit: 50,
    }),
    enabled: !!(workspace?.id),
    staleTime: 30_000,
  });
  const indexedTranscriptions = (indexedTxQuery.data?.data || []).filter(
    (t: any) => !t.deleted_at && t.rag_status === "synced"
  );

  // Load available models
  const modelsQuery = useQuery({
    queryKey: ["models", workspace?.id],
    queryFn: () => apiGet<{ chat: any[]; image: any[]; userCoins: number }>("/api/models", {
      workspaceId: workspace?.id || 0,
      type: "chat",
    }),
    enabled: !!(workspace?.id),
    staleTime: 60 * 60 * 1000,
  });

  const chatModels = modelsQuery.data?.chat || [];
  const userCoins = modelsQuery.data?.userCoins || 0;

  const currentModelName = chatModels.find(
    (m: any) => (m.id || m.model) === selectedModel
  )?.name || selectedModel.split("/").pop() || "AI";

  // Load conversation messages
  const loadConversation = useCallback(async (convId: number) => {
    setConversationId(convId);
    setMessages([]);
    // Close mobile sidebar after selection
    setSidebarOpen(false);
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
    } catch (err: any) {
      toast.error("Помилка завантаження чату");
    }
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(async (convId: number) => {
    try {
      await fetch(`/api/data/conversations/${convId}`, { method: "DELETE", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (conversationId === convId) {
        handleNewChat();
      }
      toast.success("Чат видалено");
    } catch (err: any) {
      toast.error("Помилка видалення");
    }
  }, [conversationId, queryClient]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      apiPost<{ answer: string; conversationId: number; coinsUsed: number }>("/api/chat", {
        workspaceId: workspace?.id || 0,
        message,
        conversationId: conversationId || undefined,
        model: selectedModel,
      }),
    onSuccess: (data: any) => {
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
        workspaceId: workspace?.id || 0,
        question,
        conversationId: conversationId || undefined,
        model: selectedModel,
        transcriptionId: selectedTranscription ? Number(selectedTranscription) : undefined,
      }),
    onSuccess: (data: any) => {
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
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen md:h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* ===== MOBILE: Chat history sidebar overlay ===== */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Slide-in panel */}
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-background shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="text-base font-semibold">Історія чатів</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={handleNewChat}
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Немає чатів</p>
              ) : (
                conversations.filter((c: any) => !c.deleted_at).map((conv: any) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 cursor-pointer active:bg-muted/70 transition-colors min-h-[52px]",
                      conversationId === conv.id ? "bg-muted" : "hover:bg-muted/30"
                    )}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-base">{conv.title || `Чат #${conv.id}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(conv.created_at)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 ml-2"
                      onClick={(e: any) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP: Chat history sidebar ===== */}
      {desktopSidebarOpen && (
        <div className="hidden md:flex w-64 border-r flex-col bg-muted/30">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-semibold">Історія чатів</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewChat}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDesktopSidebarOpen(false)}>
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">Немає чатів</p>
            ) : (
              conversations.filter((c: any) => !c.deleted_at).map((conv: any) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm",
                    conversationId === conv.id ? "bg-muted" : ""
                  )}
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
                    onClick={(e: any) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== MAIN CHAT AREA ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ===== MOBILE HEADER ===== */}
        <div className="flex md:hidden items-center justify-between px-3 py-2 border-b bg-background/95 backdrop-blur min-h-[52px]">
          <div className="flex items-center gap-2">
            {/* Back to dashboard on mobile */}
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-1.5">
              {/* Mode toggle */}
              <button
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px]",
                  mode === "chat" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
                onClick={() => setMode("chat")}
              >
                <Brain className="w-3.5 h-3.5" />
                Чат
              </button>
              <button
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px]",
                  mode === "rag" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
                onClick={() => setMode("rag")}
              >
                <FileText className="w-3.5 h-3.5" />
                RAG
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Model name — tap to open selector */}
            <button
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground min-h-[32px] max-w-[120px]"
              onClick={() => setModelSelectorOpen(true)}
            >
              <span className="truncate">{currentModelName}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {userCoins > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                {Math.round(userCoins)}
              </Badge>
            )}
          </div>
        </div>

        {/* ===== DESKTOP HEADER ===== */}
        <div className="hidden md:flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {!desktopSidebarOpen && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDesktopSidebarOpen(true)}>
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

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              <Button variant={mode === "chat" ? "default" : "outline"} size="sm" onClick={() => setMode("chat")}>
                <Brain className="w-4 h-4 mr-1" /> Чат
              </Button>
              <Button variant={mode === "rag" ? "default" : "outline"} size="sm" onClick={() => setMode("rag")}>
                <FileText className="w-4 h-4 mr-1" /> RAG
              </Button>
            </div>

            {/* RAG Transcription selector — desktop */}
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

        {/* ===== MOBILE: RAG transcription selector bar ===== */}
        {mode === "rag" && indexedTranscriptions.length > 0 && (
          <div className="md:hidden px-3 py-2 border-b bg-muted/30">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-background border text-sm min-h-[44px]"
              onClick={() => setRagSelectorOpen(true)}
            >
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1 text-left">
                {selectedTranscription
                  ? indexedTranscriptions.find((t: any) => String(t.id) === selectedTranscription)?.original_filename || `#${selectedTranscription}`
                  : "Оберіть транскрипцію..."}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        )}

        {/* ===== MESSAGES AREA ===== */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4">
              <MessageSquare className="w-12 h-12 md:w-16 md:h-16 mb-4 opacity-20" />
              <p className="text-base md:text-lg font-medium text-center">
                {mode === "rag" ? "Задайте питання по транскрипціям" : "Почніть розмову з AI"}
              </p>
              <p className="text-sm mt-1 text-center">
                {mode === "rag"
                  ? "AI відповість на основі ваших транскрипцій"
                  : `Модель: ${currentModelName}`
                }
              </p>
            </div>
          ) : (
            <div className="py-4 px-2 md:px-0">
              {messages.map((msg: any) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} references={msg.references} />
              ))}
              {isLoading && (
                <div className="flex gap-3 py-3 px-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl md:rounded-lg px-4 py-2 text-sm bg-muted">Думаю...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ===== INPUT ===== */}
        <div className="w-full">
          <ChatInput onSend={handleSend} isLoading={isLoading} disabled={!workspace} />
        </div>
      </div>

      {/* ===== MOBILE: Floating "New Chat" button ===== */}
      {messages.length > 0 && (
        <button
          className="md:hidden fixed bottom-20 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          onClick={handleNewChat}
        >
          <Plus className="w-5 h-5" />
        </button>
      )}

      {/* ===== MOBILE: Model selector full-screen modal ===== */}
      {modelSelectorOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b min-h-[56px]">
            <h2 className="text-lg font-semibold">Оберіть модель</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setModelSelectorOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatModels.length > 0 ? (
              chatModels.map((m: any) => {
                const modelId = m.id || m.model;
                const isSelected = modelId === selectedModel;
                return (
                  <button
                    key={modelId}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left min-h-[52px] transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50 active:bg-muted"
                    )}
                    onClick={() => {
                      setSelectedModel(modelId);
                      setModelSelectorOpen(false);
                    }}
                  >
                    <div>
                      <p className={cn("font-medium text-base", isSelected && "text-primary")}>{m.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.pricing?.coins || "?"} coins</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {modelsQuery.isLoading ? "Завантаження моделей..." : "Немає доступних моделей"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===== MOBILE: RAG transcription selector bottom sheet ===== */}
      {ragSelectorOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setRagSelectorOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200 safe-area-inset-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-base font-semibold">Транскрипція для RAG</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setRagSelectorOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <button
                className={cn(
                  "w-full flex items-center px-4 py-3 rounded-xl text-left min-h-[48px] transition-colors",
                  !selectedTranscription ? "bg-primary/5 text-primary" : "hover:bg-muted/50 active:bg-muted"
                )}
                onClick={() => {
                  setSelectedTranscription("");
                  setRagSelectorOpen(false);
                }}
              >
                <span className="text-base">Всі транскрипції</span>
              </button>
              {indexedTranscriptions.map((t: any) => {
                const isSelected = String(t.id) === selectedTranscription;
                return (
                  <button
                    key={t.id}
                    className={cn(
                      "w-full flex items-center px-4 py-3 rounded-xl text-left min-h-[48px] transition-colors",
                      isSelected ? "bg-primary/5 text-primary" : "hover:bg-muted/50 active:bg-muted"
                    )}
                    onClick={() => {
                      setSelectedTranscription(String(t.id));
                      setRagSelectorOpen(false);
                    }}
                  >
                    <span className="text-base truncate">{t.original_filename || `#${t.id}`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
