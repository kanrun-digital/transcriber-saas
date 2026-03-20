import { apiGet, apiPost } from "./api-client";
import { API_ROUTES } from "@/constants/routes";
import type { Conversation, Message, RagQueryRequest, RagQueryResponse, PaginatedResponse } from "@/types";

export async function queryRag(params: RagQueryRequest): Promise<RagQueryResponse> {
  return apiPost<RagQueryResponse>(API_ROUTES.RAG_QUERY, params);
}

export async function listConversations(workspaceId: number): Promise<PaginatedResponse<Conversation>> {
  return apiGet<PaginatedResponse<Conversation>>(API_ROUTES.DATA("conversations"), {
    workspace_id: workspaceId,
    sort: "updated_at",
    order: "desc",
    limit: 50,
  });
}

export async function getConversation(id: number): Promise<Conversation> {
  return apiGet<Conversation>(API_ROUTES.DATA_RECORD("conversations", id));
}

export async function listMessages(conversationId: number): Promise<PaginatedResponse<Message>> {
  return apiGet<PaginatedResponse<Message>>(API_ROUTES.DATA("messages"), {
    conversation_id: conversationId,
    sort: "created_at",
    order: "asc",
    limit: 200,
  });
}

/**
 * Send a chat message with optional transcription context.
 * Uses /api/chat which now supports transcriptionId.
 */
export async function sendChatMessage(params: {
  workspaceId: number;
  message: string;
  conversationId?: number;
  model?: string;
  transcriptionId?: number;
  systemPrompt?: string;
}): Promise<{
  answer: string;
  conversationId: number;
  coinsUsed: number;
  transcriptionTitle?: string;
}> {
  return apiPost("/api/chat", {
    workspaceId: params.workspaceId,
    message: params.message,
    conversationId: params.conversationId,
    model: params.model,
    transcriptionId: params.transcriptionId,
    systemPrompt: params.systemPrompt,
  });
}

/**
 * Fetch a transcription record for chat context display.
 */
export async function getTranscriptionForChat(transcriptionId: number): Promise<any> {
  return apiGet(API_ROUTES.DATA_RECORD("transcriptions", transcriptionId));
}

export const chatService = {
  queryRag,
  listConversations,
  getConversation,
  listMessages,
  sendChatMessage,
  getTranscriptionForChat,
};
