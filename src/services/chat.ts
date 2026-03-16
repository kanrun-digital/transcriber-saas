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

export const chatService = {
  queryRag,
  listConversations,
  getConversation,
  listMessages,
};
