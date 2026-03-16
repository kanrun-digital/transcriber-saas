import { apiGet, apiPut, apiDelete } from "./api-client";
import { API_ROUTES } from "@/constants/routes";
import type { PaginatedResponse, Transcription, AppUser, Workspace } from "@/types";

// ============ Users ============

export async function listAllUsers(workspaceId: number): Promise<PaginatedResponse<AppUser>> {
  return apiGet<PaginatedResponse<AppUser>>(API_ROUTES.DATA("app_users"), {
    workspace_id: workspaceId,
    limit: 200,
    sort: "created_at",
    order: "desc",
  });
}

export async function updateUser(
  userId: number,
  data: { role?: string; is_active?: number; name?: string }
): Promise<void> {
  return apiPut(API_ROUTES.DATA_RECORD("app_users", userId), data);
}

export async function deleteUser(userId: number): Promise<void> {
  return apiDelete(API_ROUTES.DATA_RECORD("app_users", userId));
}

// ============ Transcriptions ============

export async function listAllTranscriptions(
  workspaceId: number,
  params?: { page?: number; limit?: number; status?: string }
): Promise<PaginatedResponse<Transcription>> {
  return apiGet<PaginatedResponse<Transcription>>(API_ROUTES.DATA("transcriptions"), {
    workspace_id: workspaceId,
    page: params?.page,
    limit: params?.limit || 100,
    status: params?.status,
    sort: "created_at",
    order: "desc",
  });
}

export async function deleteTranscription(txId: number): Promise<void> {
  return apiDelete(API_ROUTES.DATA_RECORD("transcriptions", txId));
}

// ============ Workspaces ============

export async function updateWorkspace(
  workspaceId: number,
  data: Partial<Pick<Workspace,
    "name" | "plan" | "status" | "salad_minutes_limit" | "straico_coins_limit" |
    "max_file_size_mb" | "max_storage_gb" | "max_rag_bases" | "max_agents" |
    "max_members" | "max_transcriptions" | "default_salad_mode"
  >>
): Promise<void> {
  return apiPut(API_ROUTES.DATA_RECORD("workspaces", workspaceId), data);
}
