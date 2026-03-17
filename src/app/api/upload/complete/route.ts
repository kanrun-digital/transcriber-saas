import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { fileExists, getDownloadUrl } from "@/lib/s3";
import { createTranscriptionJob } from "@/lib/salad";
import { checkTranscriptionLimit } from "@/lib/usage";

/**
 * POST /api/upload/complete
 * 
 * Called after browser finishes uploading to S3.
 * Verifies file, checks limits, triggers Salad transcription.
 * Now accepts ALL Salad parameters from TranscriptionSettings.
 * 
 * Body: { transcriptionId, workspaceId, settings: TranscriptionSettings }
 * Legacy: { transcriptionId, workspaceId, mode?, languageCode? }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const body = await req.json();
    const { transcriptionId, workspaceId } = body;

    // Support both new (settings object) and legacy (flat params) format
    const settings = body.settings || {};
    const mode = settings.saladMode || body.mode || "full";
    const languageCode = settings.language || body.languageCode;

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
    const downloadUrl = await getDownloadUrl(tx.storage_path, 7200);

    // 6. Create Salad job with ALL settings
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/transcribe/webhook`;

    const job = await createTranscriptionJob({
      url: downloadUrl,
      mode: mode,
      languageCode: languageCode || tx.language || undefined,
      diarization: settings.enableDiarization ?? (tx.enable_diarization === 1),
      sentenceTimestamps: settings.sentenceTimestamps ?? true,
      sentenceDiarization: settings.sentenceDiarization,
      wordTimestamps: settings.wordTimestamps ?? false,
      multichannel: settings.multichannel ?? false,
      srt: settings.srt ?? true,
      summarize: mode === "full" ? (settings.summarize ?? 200) : 0,
      translate: settings.translate || undefined,
      llmTranslation: settings.llmTranslation || undefined,
      srtTranslation: settings.srtTranslation || undefined,
      customVocabulary: settings.customVocabulary || undefined,
      customPrompt: settings.customPrompt || undefined,
      returnAsFile: settings.returnAsFile ?? true,
      webhook: webhookUrl,
      metadata: {
        transcriptionId,
        workspaceId,
      },
    });

    // 7. Update transcription → transcribing
    await ncb.update("transcriptions", transcriptionId, {
      status: "transcribing",
      salad_job_id: job.id,
      salad_mode: mode,
      language: languageCode || tx.language || null,
      enable_diarization: settings.enableDiarization ? 1 : 0,
    });

    // 8. Log storage event (non-critical)
    if (tx.storage_file_id) {
      try {
        await ncb.create("storage_file_events", {
          workspace_id: workspaceId,
          storage_file_id: tx.storage_file_id,
          event_type: "transcription",
          event_status: "started",
          details_json: JSON.stringify({ salad_job_id: job.id, mode }),
        });
      } catch (e) { console.warn("[Complete] Event log failed:", e); }
    }

    console.log(`[Upload/Complete] tx=${transcriptionId} → Salad job ${job.id} (${mode})`);

    return NextResponse.json({
      jobId: job.id,
      status: "transcribing",
      message: "Transcription started",
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Upload/Complete] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
