import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import {
  uploadText, uploadJson, buildTranscriptKey, buildTranscriptJsonKey,
  buildSrtKey, buildRagInputKey, buildRagInput, getDownloadUrl,
} from "@/lib/s3";
import { uploadFileToRag } from "@/lib/straico";
import { recordTranscriptionUsage } from "@/lib/usage";

/**
 * POST /api/transcribe/webhook
 * 
 * Salad callback. Stores artifacts in S3, updates NCB metadata,
 * auto-syncs to RAG if workspace has a rag_base.
 * 
 * Artifacts stored in S3:
 *   full_text.txt     — plain text
 *   transcript.json   — timestamped segments
 *   captions.srt      — SRT subtitles  
 *   rag_input.txt     — timestamped blocks for Straico RAG
 * 
 * NCB stores only: summary, preview (first 500 chars), URLs, metadata
 */
export async function POST(req: NextRequest) {
  try {
    const job = await req.json();
    const jobId = job.id;
    const status = job.status;
    const output = job.output;

    console.log(`[Webhook] Job ${jobId} status: ${status}`);

    // 1. Find transcription
    const txList = await ncb.search<any>("transcriptions", { salad_job_id: jobId });
    const tx = txList[0];
    if (!tx) {
      console.error(`[Webhook] No transcription for job ${jobId}`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const wsId = String(tx.workspace_id);
    const txId = String(tx.id);

    // 2. Failure
    if (status === "failed" || status === "cancelled") {
      await ncb.update("transcriptions", tx.id, {
        status: "failed",
        error_message: `Salad job ${status}`,
        updated_at: now(),
      });
      return NextResponse.json({ ok: true, status: "failed" });
    }

    // 3. Success
    if (status === "succeeded" && output) {
      const text = output.text || "";
      const segments = output.sentence_level_timestamps || [];
      const srtContent = output.srt_content || "";
      const durationSec = (output.duration || 0) * 3600;
      const processingTime = output.processing_time || 0;
      const wordCount = text.split(/\s+/).filter(Boolean).length;

      // 3a. Upload artifacts to S3
      const [textRes, jsonRes, srtRes] = await Promise.all([
        uploadText(buildTranscriptKey(wsId, txId), text),
        uploadJson(buildTranscriptJsonKey(wsId, txId), {
          duration_seconds: Math.round(durationSec),
          word_count: wordCount,
          segments,
        }),
        srtContent
          ? uploadText(buildSrtKey(wsId, txId), srtContent)
          : Promise.resolve({ success: true, key: "" }),
      ]);

      // 3b. Build and upload RAG input (timestamped blocks)
      let ragInputUploaded = false;
      if (segments.length > 0) {
        const ragText = buildRagInput(segments, tx.original_filename);
        await uploadText(buildRagInputKey(wsId, txId), ragText);
        ragInputUploaded = true;
      }

      // 3c. Count speakers
      const speakers = segments.length > 0
        ? new Set(segments.map((s: any) => s.speaker).filter(Boolean)).size
        : null;

      // 3d. Store S3 keys (NOT presigned URLs — URLs expire, keys are permanent)
      const textS3Key = buildTranscriptKey(wsId, txId);
      const jsonS3Key = buildTranscriptJsonKey(wsId, txId);
      const srtS3Key = srtContent ? buildSrtKey(wsId, txId) : null;

      // 3e. Update NCB — metadata only + searchable preview
      const preview = text.substring(0, 500);
      const summary = output.summary || null;
      const sentiment = output.overall_sentiment || null;
      const topics = output.overall_classification
        ? JSON.stringify([output.overall_classification]) : "[]";

      await ncb.update("transcriptions", tx.id, {
        status: "completed",
        transcript_text: preview, // searchable preview only (indexed)
        transcript_segments_json: null, // NOT stored in NCB, use transcript.json in S3
        detected_language: job.input?.language_code || null,
        duration_seconds: Math.round(durationSec),
        num_speakers: speakers,
        salad_mode: tx.salad_mode || "full",
        srt_content: null, // NOT stored in NCB, use captions.srt in S3
        summary,
        sentiment,
        topics_json: topics,
        processing_time_seconds: processingTime,
        word_count: wordCount,
        // S3 artifact keys (permanent — presigned URLs generated on-demand)
        transcript_text_url: textS3Key,
        transcript_json_url: jsonS3Key,
        srt_url: srtS3Key,
        error_message: null,
        updated_at: now(),
      });

      // 3f. Record usage
      await recordTranscriptionUsage(tx.workspace_id, tx.app_user_id, Math.round(durationSec), tx.id);

      // 3g. Auto-sync to RAG
      if (ragInputUploaded) {
        await autoSyncToRag(tx, wsId, txId);
      }

      // 3h. Log storage event
      if (tx.storage_file_id) {
        await ncb.create("storage_file_events", {
          workspace_id: tx.workspace_id,
          storage_file_id: tx.storage_file_id,
          event_type: "upload",
          event_status: "completed",
          duration_ms: Math.round(processingTime * 1000),
          details_json: JSON.stringify({
            words: wordCount,
            duration_sec: Math.round(durationSec),
            speakers,
            artifacts: ["full_text.txt", "transcript.json", srtContent ? "captions.srt" : null, "rag_input.txt"].filter(Boolean),
          }),
        });
      }

      console.log(`[Webhook] tx=${tx.id} done. ${wordCount}w ${Math.round(durationSec / 60)}min. RAG: ${ragInputUploaded}`);
      return NextResponse.json({ ok: true, status: "completed" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Auto-sync transcript to workspace RAG base after transcription.
 * Creates RAG base if none exists. Uses rag_input.txt (timestamped).
 */
async function autoSyncToRag(tx: any, wsId: string, txId: string): Promise<void> {
  try {
    // Find workspace's RAG base
    let ragBase: any = null;

    if (tx.rag_base_id) {
      ragBase = await ncb.readOne("rag_bases", tx.rag_base_id);
      if (ragBase?.deleted_at) ragBase = null;
    }

    if (!ragBase) {
      // Find any active RAG base for this workspace
      const rags = await ncb.search<any>("rag_bases", { workspace_id: tx.workspace_id, status: "active" });
      ragBase = rags.find((r: any) => !r.deleted_at);
    }

    if (!ragBase?.straico_rag_id) {
      // No RAG base yet — mark as pending, user can Reindex later
      await ncb.update("transcriptions", tx.id, { rag_status: "pending" });
      return;
    }

    // Update status
    await ncb.update("transcriptions", tx.id, { rag_status: "syncing" });

    // Get presigned URL for rag_input.txt
    const ragInputUrl = await getDownloadUrl(buildRagInputKey(wsId, txId), 7200);

    // Upload to Straico RAG
    await uploadFileToRag(
      ragBase.straico_rag_id,
      ragInputUrl,
      `transcript-${txId}-${tx.original_filename || "audio"}.txt`
    );

    // Update transcription
    await ncb.update("transcriptions", tx.id, {
      rag_synced: 1,
      rag_status: "synced",
      rag_synced_at: now(),
      rag_base_id: ragBase.id,
    });

    // Update RAG base sync time
    await ncb.update("rag_bases", ragBase.id, { last_synced_at: now() });

    console.log(`[RAG] Auto-synced tx=${tx.id} → rag_base=${ragBase.id}`);
  } catch (error: any) {
    console.error(`[RAG] Auto-sync failed for tx=${tx.id}:`, error.message);
    await ncb.update("transcriptions", tx.id, {
      rag_status: "error",
      error_message: `RAG sync failed: ${error.message}`,
    });
  }
}

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
