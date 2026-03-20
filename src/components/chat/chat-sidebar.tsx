"use client";

import { Button } from "@/components/ui/button";
import { Plus, PanelLeftClose, Trash2, MessageSquare, FileText, Bot } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  metadata_json?: string | null;
}

interface ConversationMeta {
  chatType: "simple" | "transcription" | "rag";
  transcriptionId: number | null;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onDeleteConversation: (id: number) => void;
  onNewChat: () => void;
  onClose: () => void;
  getConversationMeta: (conv: Conversation) => ConversationMeta;
}

function ChatTypeIcon({ chatType }: { chatType: string }) {
  switch (chatType) {
    case "transcription":
      return <span className="text-xs" title="Чат з транскрипцією">📝</span>;
    case "rag":
      return <span className="text-xs" title="RAG чат">🤖</span>;
    default:
      return <span className="text-xs" title="Звичайний чат">💬</span>;
  }
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  onClose,
  getConversationMeta,
}: ChatSidebarProps) {
  return (
    <div className="w-64 border-r flex flex-col bg-muted/30">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-semibold">Історія чатів</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNewChat}>
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">Немає чатів</p>
        ) : (
          conversations.map((conv) => {
            const meta = getConversationMeta(conv);
            return (
              <div
                key={conv.id}
                className={`group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm ${
                  activeConversationId === conv.id ? "bg-muted" : ""
                }`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <ChatTypeIcon chatType={meta.chatType} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{conv.title || `Чат #${conv.id}`}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDate(conv.created_at)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
