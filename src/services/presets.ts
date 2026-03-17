import { apiGet, apiPost, apiPut, apiDelete } from "./api-client";
import { API_ROUTES } from "@/constants/routes";
import type { Preset, PaginatedResponse } from "@/types";

export async function listPresets(workspaceId: number): Promise<PaginatedResponse<Preset>> {
  return apiGet<PaginatedResponse<Preset>>(API_ROUTES.DATA("presets"), {
    workspace_id: workspaceId,
    limit: 100,
    sort: "created_at",
    order: "desc",
  });
}

export async function createPreset(data: {
  workspace_id: number;
  app_user_id: number;
  title: string;
  description?: string;
  category?: string;
  transcription_type: string;
  config_json: string;
  is_active?: number;
}): Promise<{ id: number }> {
  return apiPost(API_ROUTES.DATA("presets"), data);
}

export async function updatePreset(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    category: string;
    transcription_type: string;
    config_json: string;
    is_active: number;
  }>
): Promise<void> {
  return apiPut(API_ROUTES.DATA_RECORD("presets", id), data);
}

export async function deletePreset(id: number): Promise<void> {
  return apiDelete(API_ROUTES.DATA_RECORD("presets", id));
}
