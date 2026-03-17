import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { createTranscriptionJob } from "@/lib/salad";
import type { SaladMode } from "@/types";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * POST /api/upload/from-url
 * 
 * Creates a transcription directly from a URL (Google Drive, Dropbox, direct link).
 * No S3 upload needed — Salad fetches the file from the URL.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { url, source, workspaceId, settings } = body;

    if (!url || !workspaceId) {
      return NextResponse.json({ error: "URL and workspaceId required" }, { status: 400 });
    }

    // Determine filename from URL
    let filename = "url-import";
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes(".")) {
        filename = decodeURIComponent(lastPart);
      } else {
        filename = `${source || "url"}-import-${Date.now()}`;
      }
    } catch {}

    const saladMode: SaladMode = settings?.saladMode || "full";

    // 1. Create transcription record in NCB
    const txRecord = await ncb.create<any>("transcriptions", {
      workspace_id: workspaceId,
      original_filename: filename,
      storage_url: url,
      status: "transcribing",
      salad_mode: saladMode,
      language: settings?.language || "uk",
      enable_diarization: settings?.enableDiarization ? 1 : 0,
      created_at: now(),
      updated_at: now(),
    });

    const txId = txRecord.id;

    // 2. Build Salad job params
    const jobInput: Record<string, unknown> = {
      url,
      language_code: settings?.language || "uk",
      sentence_level_timestamps: settings?.sentenceTimestamps ?? true,
      word_level_timestamps: settings?.wordTimestamps ?? false,
      diarization: settings?.enableDiarization ?? true,
    };

    // Full mode extras
    if (saladMode === "full") {
      if (settings?.srt) jobInput.srt = true;
      if (settings?.summarize) jobInput.summarize = settings.summarize;
      if (settings?.translate) jobInput.translate = settings.translate;
      if (settings?.customPrompt) jobInput.custom_prompt = settings.customPrompt;
      if (settings?.customVocabulary) jobInput.custom_vocabulary = settings.customVocabulary;
      if (settings?.sentenceDiarization) jobInput.sentence_diarization = true;
      if (settings?.multichannel) jobInput.multichannel = true;
      if (settings?.returnAsFile) jobInput.return_as_file = true;
      if (settings?.llmTranslation) jobInput.llm_translation = settings.llmTranslation;
      if (settings?.srtTranslation) jobInput.srt_translation = settings.srtTranslation;
      if (settings?.overallSentiment) jobInput.overall_sentiment = true;
      if (settings?.overallClassification) jobInput.overall_classification = true;
    }

    // Webhook
    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] || "https://transcriber.tolqa.com";
    jobInput.webhook_url = `${appUrl}/api/transcribe/webhook`;

    // 3. Submit to Salad
   const saladJob = await createTranscriptionJob({ ...jobInput, mode: saladMode } as any);


    // 4. Update transcription with job ID
    await ncb.update("transcriptions", txId, {
      salad_job_id: saladJob.id,
      updated_at: now(),
    });

    return NextResponse.json({
      ok: true,
      transcriptionId: txId,
      saladJobId: saladJob.id,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[URL Import] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
