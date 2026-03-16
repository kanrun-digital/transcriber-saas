import { apiGet, apiDelete, apiPost } from "./api-client";
import { API_ROUTES } from "@/constants/routes";
import type { Transcription, PaginatedResponse } from "@/types";

export interface ListTranscriptionsParams {
  workspaceId: number;
  page?: number;
  limit?: number;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export async function listTranscriptions(
  params: ListTranscriptionsParams
): Promise<PaginatedResponse<Transcription>> {
  return apiGet<PaginatedResponse<Transcription>>(API_ROUTES.TRANSCRIPTIONS, {
    workspace_id: params.workspaceId,
    page: params.page,
    limit: params.limit,
    status: params.status,
    sort: params.sort || "created_at",
    order: params.order || "desc",
  });
}

export async function getTranscription(id: number): Promise<Transcription> {
  return apiGet<Transcription>(API_ROUTES.TRANSCRIPTION(id));
}

export async function deleteTranscription(id: number): Promise<{ ok: boolean; warnings?: string[] }> {
  return apiDelete(API_ROUTES.TRANSCRIPTION(id));
}

export async function syncRag(transcriptionId: number, workspaceId: number): Promise<{ ok: boolean }> {
  return apiPost(API_ROUTES.RAG_SYNC, { transcriptionId, workspaceId });
}

export interface ArtifactUrls {
  textUrl?: string;
  jsonUrl?: string;
  srtUrl?: string;
  audioUrl?: string;
}

export async function getArtifactUrls(transcriptionId: number): Promise<ArtifactUrls> {
  return apiGet<ArtifactUrls>(API_ROUTES.TRANSCRIPTION_ARTIFACTS(transcriptionId));
}
