import { apiPost } from "./api-client";
import { API_ROUTES } from "@/constants/routes";
import type { PresignResponse, UploadCompleteResponse, SaladMode } from "@/types";

export interface PresignParams {
  filename: string;
  contentType: string;
  size: number;
  workspaceId: number;
  appUserId: number;
  projectId?: number;
  language?: string;
  enableDiarization?: boolean;
  saladMode?: SaladMode;
}

export async function presignUpload(params: PresignParams): Promise<PresignResponse> {
  return apiPost<PresignResponse>(API_ROUTES.UPLOAD_PRESIGN, params);
}

/**
 * Upload file to S3 via presigned URL with XHR for progress tracking.
 * Returns a promise + abort controller.
 */
export function uploadToS3(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void
): { promise: Promise<void>; abort: () => void } {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<void>((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Помилка мережі при завантаженні"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Завантаження скасовано"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });

  return {
    promise,
    abort: () => xhr.abort(),
  };
}

export async function completeUpload(params: {
  transcriptionId: number;
  workspaceId: number;
  mode?: SaladMode;
  languageCode?: string;
}): Promise<UploadCompleteResponse> {
  return apiPost<UploadCompleteResponse>(API_ROUTES.UPLOAD_COMPLETE, params);
}
