import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import {
  uploadText, uploadJson, buildTranscriptKey, buildTranscriptJsonKey,
  buildSrtKey, buildRagInputKey, buildRagInput, getDownloadUrl,
} from "@/lib/s3";
import { recordTranscriptionUsage } from "@/lib/usage";

/**
 * POST /api/transcribe/webhook
 * 
 * Salad callback. Stores artifacts in S3, updates NCB metadata.
 * 
 * Salad sends the full job object. When return_as_file=true,
 * output contains { url, duration, processing_time } — we must
 * fetch the actual transcript from output.url.
 */
export async function POST(req: NextRequest) {
  try {
    const job = await req.json();
    const jobId = job.id;
    const status = job.status;

    console.log(`[Webhook] Job ${jobId} status: ${status}`, JSON.stringify(job).substring(0, 200));

    if (!jobId) {
      console.error("[Webhook] No job id in payload");
      return NextResponse.json({ error: "No job id" }, { status: 400 });
    }

    // 1. Find transcription by salad_job_id using read with filter (not search)
    const txResult = await ncb.read<any>("transcriptions", {
      filters: { salad_job_id: jobId },
      limit: 1,
    });
    const tx = txResult.data?.[0];
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
    if (status === "succeeded") {
      let output = job.output || {};

      // If output has URL (return_as_file=true), fetch the actual transcript
      if (output.url && !output.text) {
        console.log(`[Webhook] Fetching transcript from URL: ${output.url.substring(0, 80)}...`);
        try {
          const res = await fetch(output.url);
          if (res.ok) {
            const fullOutput = await res.json();
            // Merge: keep duration/processing_time from original, text/segments from fetched
            output = { ...output, ...fullOutput };
          } else {
            console.error(`[Webhook] Failed to fetch output URL: ${res.status}`);
          }
        } catch (e: any) {
          console.error(`[Webhook] Error fetching output URL:`, e.message);
        }
      }

      const text = output.text || "";
      const segments = output.sentence_level_timestamps || [];
      const srtContent = output.srt_content || "";
      const summary = output.summary || null;
      const durationSec = output.duration_in_seconds || (output.duration || 0) * 3600;
      const processingTime = output.processing_time || 0;
      const wordCount = text.split(/\s+/).filter(Boolean).length;

      // 3a. Upload artifacts to S3
      try {
        await Promise.all([
          text ? uploadText(buildTranscriptKey(wsId, txId), text) : Promise.resolve(),
          segments.length > 0 ? uploadJson(buildTranscriptJsonKey(wsId, txId), {
            duration_seconds: Math.round(durationSec),
            word_count: wordCount,
            segments,
          }) : Promise.resolve(),
          srtContent ? uploadText(buildSrtKey(wsId, txId), srtContent) : Promise.resolve(),
        ]);
      } catch (e: any) {
        console.warn("[Webhook] S3 upload failed (non-critical):", e.message);
      }

      // 3b. Build and upload RAG input
      let ragInputUploaded = false;
      if (segments.length > 0) {
        try {
          const ragText = buildRagInput(segments, tx.original_filename);
          await uploadText(buildRagInputKey(wsId, txId), ragText);
          ragInputUploaded = true;
        } catch (e: any) {
          console.warn("[Webhook] RAG input upload failed:", e.message);
        }
      }

      // 3c. Count speakers
      const speakers = segments.length > 0
        ? new Set(segments.map((s: any) => s.speaker).filter(Boolean)).size
        : null;

      // 3d. S3 keys
      const textS3Key = text ? buildTranscriptKey(wsId, txId) : null;
      const jsonS3Key = segments.length > 0 ? buildTranscriptJsonKey(wsId, txId) : null;
      const srtS3Key = srtContent ? buildSrtKey(wsId, txId) : null;

      // 3e. Update NCB
      const preview = text.substring(0, 500);
      const sentiment = output.overall_sentiment || null;
      const topics = output.overall_classification
        ? JSON.stringify([output.overall_classification]) : "[]";

      await ncb.update("transcriptions", tx.id, {
        status: "completed",
        transcript_text: preview || text.substring(0, 500),
        detected_language: job.input?.language_code || null,
        duration_seconds: Math.round(durationSec),
        num_speakers: speakers,
        summary,
        sentiment,
        topics_json: topics,
        processing_time_seconds: processingTime,
        word_count: wordCount,
        transcript_text_url: textS3Key,
        transcript_json_url: jsonS3Key,
        srt_url: srtS3Key,
        error_message: null,
        updated_at: now(),
      });

      // 3f. Record usage (non-critical)
      try {
        await recordTranscriptionUsage(tx.workspace_id, tx.app_user_id, Math.round(durationSec), tx.id);
      } catch (e: any) {
        console.warn("[Webhook] Usage recording failed:", e.message);
      }

      // 3g. Log storage event (non-critical)
      if (tx.storage_file_id) {
        try {
          await ncb.create("storage_file_events", {
            workspace_id: tx.workspace_id,
            storage_file_id: tx.storage_file_id,
            event_type: "transcription",
            event_status: "completed",
            duration_ms: Math.round(processingTime * 1000),
            details_json: JSON.stringify({ words: wordCount, duration_sec: Math.round(durationSec), speakers }),
          });
        } catch (e) { console.warn("[Webhook] Event log failed:", e); }
      }

      console.log(`[Webhook] tx=${tx.id} COMPLETED. ${wordCount} words, ${Math.round(durationSec)}s, ${speakers} speakers`);
      return NextResponse.json({ ok: true, status: "completed" });
    }

    // Other statuses (running, pending)
    console.log(`[Webhook] Job ${jobId} status ${status} — no action`);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Webhook] Error:", error.message || error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
