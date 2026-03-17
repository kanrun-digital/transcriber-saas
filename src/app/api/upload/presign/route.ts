import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { buildAudioKey, getUploadUrl, validateFile } from "@/lib/s3";
import { checkStorageLimit, checkTranscriptionLimit, recordStorageUsage } from "@/lib/usage";
import { randomUUID } from "crypto";

/**
 * POST /api/upload/presign
 * 
 * Generate presigned URL for browser → S3 upload.
 * Creates storage_files + transcriptions records.
 * Checks file size, storage quota, transcription count.
 * Uses workspace default_salad_mode if not specified.
 * 
 * Body: { filename, contentType, size, workspaceId, appUserId, projectId?, language?, enableDiarization?, saladMode? }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const {
      filename, contentType, size, workspaceId, appUserId,
      projectId, language, enableDiarization = true, saladMode,
    } = await req.json();

    if (!filename || !contentType || !size || !workspaceId || !appUserId) {
      return NextResponse.json(
        { error: "Missing: filename, contentType, size, workspaceId, appUserId" },
        { status: 400 }
      );
    }

    // Validate file type + size
    const validationError = validateFile(contentType, size);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Get workspace for limits + defaults
    const ws = await ncb.readOne<any>("workspaces", workspaceId);
    if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    if (ws.status !== "active") {
      return NextResponse.json({ error: "Workspace is suspended" }, { status: 403 });
    }

    // Check per-file size limit
    const maxMb = ws.max_file_size_mb || 500;
    if (size > maxMb * 1024 * 1024) {
      return NextResponse.json({ error: `File too large. Max: ${maxMb} MB` }, { status: 400 });
    }

    // Check transcription count + minutes
    const txCheck = await checkTranscriptionLimit(workspaceId);
    if (!txCheck.allowed) {
      return NextResponse.json({ error: txCheck.reason }, { status: 429 });
    }

    // Check storage quota
    const storageCheck = await checkStorageLimit(workspaceId, size);
    if (!storageCheck.allowed) {
      return NextResponse.json({ error: storageCheck.reason }, { status: 429 });
    }

    // Determine salad mode from request or workspace default
    const mode = saladMode || ws.default_salad_mode || "full";

    // Generate S3 key
    const fileUuid = randomUUID();
    const s3Key = buildAudioKey(String(workspaceId), fileUuid, filename);

    // Presigned upload URL
    const uploadUrl = await getUploadUrl(s3Key, contentType, 3600);

    // Create storage_files record
    const storageFile = await ncb.create("storage_files", {
      workspace_id: workspaceId,
      owner_user_id: appUserId,
      entity_type: "generic",
      bucket_name: process.env.S3_BUCKET!,
      object_key: s3Key,
      original_name: filename,
      mime_type: contentType,
      file_size_bytes: size,
      visibility: "private",
      storage_status: "uploaded",
    });

    // Create transcription record
    const transcription = await ncb.create("transcriptions", {
      workspace_id: workspaceId,
      app_user_id: appUserId,
      project_id: projectId || null,
      storage_path: s3Key,
      original_filename: filename,
      mime_type: contentType,
      file_size_bytes: size,
      language: language || null,
      enable_diarization: enableDiarization ? 1 : 0,
      salad_mode: mode,
      storage_file_id: storageFile.id,
      status: "uploaded",
    });

    // Update storage usage (non-critical)
    try {
      await recordStorageUsage(workspaceId, size);
    } catch (e) {
      console.warn("[Presign] Storage usage update failed (non-critical):", e);
    }

    // Log event (non-critical, don't block upload)
    try {
      await ncb.create("storage_file_events", {
        workspace_id: workspaceId,
        storage_file_id: storageFile.id,
        event_type: "upload",
        event_status: "started",
        details_json: JSON.stringify({ filename, contentType, size, salad_mode: mode }),
      });
    } catch (e) {
      console.warn("[Presign] Event logging failed (non-critical):", e);
    }

    return NextResponse.json({
      uploadUrl,
      transcriptionId: transcription.id,
      storageFileId: storageFile.id,
      s3Key,
      saladMode: mode,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Presign] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
