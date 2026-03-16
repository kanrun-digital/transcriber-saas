import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { fileExists, getFileUrl } from "@/lib/s3";
import { createTranscriptionJob } from "@/lib/salad";
import { checkTranscriptionLimit } from "@/lib/usage";

/**
 * POST /api/upload/complete
 * 
 * Called after browser finishes uploading to S3.
 * Verifies file, checks limits, triggers Salad transcription.
 * 
 * Body: { transcriptionId, workspaceId, mode?, languageCode? }
 * Returns: { jobId, status }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const { transcriptionId, workspaceId, mode, languageCode } = await req.json();

    if (!transcriptionId || !workspaceId) {
      return NextResponse.json({ error: "Missing transcriptionId or workspaceId" }, { status: 400 });
    }

    // 1. Get transcription record
    const tx = await ncb.readOne<any>("transcriptions", transcriptionId);
    if (!tx) {
      return NextResponse.json({ error: "Transcription not found" }, { status: 404 });
    }

    // 2. Verify file in S3
    const meta = await fileExists(tx.storage_path);
    if (!meta.exists) {
      await ncb.update("transcriptions", transcriptionId, { status: "failed", error_message: "File not found in S3" });
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }

    // 3. Check transcription limit
    const estimatedMinutes = meta.size ? (meta.size / (16000 * 60)) * 8 : 0;
    const usageCheck = await checkTranscriptionLimit(workspaceId, estimatedMinutes);
    if (!usageCheck.allowed) {
      await ncb.update("transcriptions", transcriptionId, { status: "failed", error_message: usageCheck.reason });
      return NextResponse.json({
        error: usageCheck.reason,
        usage: { used: usageCheck.used, limit: usageCheck.limit, remaining: usageCheck.remaining },
      }, { status: 429 });
    }

    // 4. Update file size from S3 metadata
    if (meta.size) {
      await ncb.update("transcriptions", transcriptionId, { file_size_bytes: meta.size });
    }

    // 5. Presigned download URL for Salad (2 hours)
    const downloadUrl = await getFileUrl(tx.storage_path, 7200);

    // 6. Create Salad job
    const saladMode = mode || "full";
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/transcribe/webhook`;

    const job = await createTranscriptionJob({
      url: downloadUrl,
      languageCode: languageCode || tx.language || undefined,
      mode: saladMode,
      diarization: tx.enable_diarization === 1,
      sentenceTimestamps: true,
      srt: true,
      summarize: saladMode === "full" ? 200 : 0,
      webhook: webhookUrl,
    });

    // 7. Update transcription → transcribing
    await ncb.update("transcriptions", transcriptionId, {
      status: "transcribing",
      salad_job_id: job.id,
      salad_mode: saladMode,
    });

    // 8. Log storage event
    if (tx.storage_file_id) {
      await ncb.create("storage_file_events", {
        workspace_id: workspaceId,
        storage_file_id: tx.storage_file_id,
        event_type: "upload",
        event_status: "completed",
        details_json: JSON.stringify({ salad_job_id: job.id, mode: saladMode }),
      });
    }

    console.log(`[Upload/Complete] tx=${transcriptionId} → Salad job ${job.id} (${saladMode})`);

    return NextResponse.json({
      jobId: job.id,
      status: "transcribing",
      message: "Transcription started",
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Upload/Complete] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
