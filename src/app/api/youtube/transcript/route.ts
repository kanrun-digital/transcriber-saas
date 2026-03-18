import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
// @ts-ignore — youtube-transcript doesn't have types
import { YoutubeTranscript } from "youtube-transcript";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * POST /api/youtube/transcript
 * 
 * Body: { url, workspaceId, language? }
 * 
 * 1. Extract video ID
 * 2. Fetch YouTube captions via youtube-transcript package
 * 3. Save as completed transcription
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { url, workspaceId, language } = body;

    if (!url || !workspaceId) {
      return NextResponse.json({ error: "URL and workspaceId required" }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Невірний YouTube URL" }, { status: 400 });
    }

    // Fetch transcript using youtube-transcript package
    let segments: Array<{ text: string; offset: number; duration: number }> = [];
    let detectedLang = language || "auto";

    try {
      const config: any = {};
      if (language) config.lang = language;
      segments = await YoutubeTranscript.fetchTranscript(videoId, config);
    } catch (e: any) {
      return NextResponse.json({
        ok: false,
        hasCaptions: false,
        videoId,
        message: e.message || "Субтитри не знайдено. Можна транскрибувати через AI.",
      });
    }

    if (!segments || segments.length === 0) {
      return NextResponse.json({
        ok: false,
        hasCaptions: false,
        videoId,
        message: "Субтитри не знайдено. Можна транскрибувати через AI.",
      });
    }

    // Build full text
    const fullText = segments.map((s: any) => s.text).join(" ").replace(/\s+/g, " ").trim();

    if (fullText.length < 10) {
      return NextResponse.json({
        ok: false,
        hasCaptions: false,
        videoId,
        message: "Субтитри порожні.",
      });
    }

    // Get video title via oEmbed
    let videoTitle = `YouTube: ${videoId}`;
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        videoTitle = oembed.title || videoTitle;
      }
    } catch {}

    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    const lastSeg = segments[segments.length - 1];
    const durationSec = lastSeg ? Math.round((lastSeg.offset + lastSeg.duration) / 1000) : 0;

    // Save as completed transcription
    const txRecord = await ncb.create("transcriptions", {
      workspace_id: workspaceId,
      app_user_id: 0,
      original_filename: videoTitle,
      storage_url: url,
      source_type: "youtube",
      status: "completed",
      salad_mode: "full",
      language: detectedLang,
      detected_language: detectedLang,
      transcript_text: fullText.substring(0, 500),
      word_count: wordCount,
      duration_seconds: durationSec,
      created_at: now(),
      updated_at: now(),
    });

    return NextResponse.json({
      ok: true,
      hasCaptions: true,
      videoId,
      videoTitle,
      transcriptionId: txRecord.id,
      language: detectedLang,
      wordCount,
      durationSeconds: durationSec,
      textPreview: fullText.substring(0, 200),
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[YouTube] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
