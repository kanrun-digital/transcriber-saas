import { apiGet } from "./api-client";
import { API_ROUTES } from "@/constants/routes";
import type { AdminStats, PaginatedResponse, Transcription, AppUser } from "@/types";

export async function getAdminStats(workspaceId: number): Promise<AdminStats> {
  return apiGet<AdminStats>(API_ROUTES.ADMIN_STATS, { workspaceId });
}

export async function listAllUsers(workspaceId: number): Promise<PaginatedResponse<AppUser>> {
  return apiGet<PaginatedResponse<AppUser>>(API_ROUTES.DATA("app_users"), {
    workspace_id: workspaceId,
    limit: 200,
    sort: "created_at",
    order: "desc",
  });
}

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
