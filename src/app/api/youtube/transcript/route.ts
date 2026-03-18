import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

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
 * Fetch YouTube captions (auto-generated or manual)
 * Uses the internal YouTube timedtext API — no API key needed
 */
async function fetchYouTubeCaptions(videoId: string, lang?: string): Promise<{
  text: string;
  segments: Array<{ start: number; dur: number; text: string }>;
  language: string;
} | null> {
  try {
    // First get the video page to find caption tracks
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "Accept-Language": lang || "en" },
    });
    const html = await pageRes.text();

    // Extract captions JSON from page
    const captionMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"/s);
    if (!captionMatch) return null;

    let captionsData: any;
    try {
      captionsData = JSON.parse(captionMatch[1]);
    } catch {
      return null;
    }

    const tracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) return null;

    // Find preferred language track
    let track = tracks.find((t: any) => t.languageCode === (lang || "uk")) 
      || tracks.find((t: any) => t.languageCode === "en")
      || tracks[0];

    if (!track?.baseUrl) return null;

    // Fetch the actual captions XML
    const captionRes = await fetch(track.baseUrl + "&fmt=json3");
    if (!captionRes.ok) {
      // Try XML format
      const xmlRes = await fetch(track.baseUrl);
      if (!xmlRes.ok) return null;
      const xml = await xmlRes.text();
      
      // Parse XML captions
      const segments: Array<{ start: number; dur: number; text: string }> = [];
      const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>(.*?)<\/text>/gs;
      let match;
      while ((match = regex.exec(xml)) !== null) {
        segments.push({
          start: parseFloat(match[1]),
          dur: parseFloat(match[2]),
          text: match[3].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, ""),
        });
      }

      const fullText = segments.map((s: any) => s.text).join(" ");
      return { text: fullText, segments, language: track.languageCode };
    }

    const json = await captionRes.json();
    const events = json.events || [];
    const segments: Array<{ start: number; dur: number; text: string }> = [];

    for (const event of events) {
      if (event.segs) {
        const text = event.segs.map((s: any) => s.utf8).join("").trim();
        if (text) {
          segments.push({
            start: (event.tStartMs || 0) / 1000,
            dur: (event.dDurationMs || 0) / 1000,
            text,
          });
        }
      }
    }

    const fullText = segments.map((s: any) => s.text).join(" ");
    return { text: fullText, segments, language: track.languageCode };
  } catch (e) {
    console.error("[YouTube Captions] Error:", e);
    return null;
  }
}

/**
 * POST /api/youtube/transcript
 * 
 * Body: { url, workspaceId, language? }
 * 
 * 1. Extract video ID from URL
 * 2. Try to get YouTube captions (free, instant)
 * 3. If captions available — save as transcription
 * 4. If not — return info that Salad transcription needed
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

    // Try to get captions
    const captions = await fetchYouTubeCaptions(videoId, language);

    if (!captions || !captions.text || captions.text.length < 10) {
      return NextResponse.json({
        ok: false,
        hasCaptions: false,
        videoId,
        message: "Субтитри не знайдено. Можна транскрибувати через AI (витрачає хвилини).",
      });
    }

    // Get video title from oEmbed
    let videoTitle = `YouTube: ${videoId}`;
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        videoTitle = oembed.title || videoTitle;
      }
    } catch {}

    // Save as transcription
    const wordCount = captions.text.split(/\s+/).filter(Boolean).length;
    const durationSec = captions.segments.length > 0 
      ? captions.segments[captions.segments.length - 1].start + captions.segments[captions.segments.length - 1].dur
      : 0;

    const txRecord = await ncb.create("transcriptions", {
      workspace_id: workspaceId,
      original_filename: videoTitle,
      storage_url: url,
      source_type: "youtube",
      status: "completed",
      salad_mode: "full",
      language: captions.language,
      detected_language: captions.language,
      transcript_text: captions.text.substring(0, 500),
      word_count: wordCount,
      duration_seconds: Math.round(durationSec),
      created_at: now(),
      updated_at: now(),
    });

    return NextResponse.json({
      ok: true,
      hasCaptions: true,
      videoId,
      videoTitle,
      transcriptionId: txRecord.id,
      language: captions.language,
      wordCount,
      durationSeconds: Math.round(durationSec),
      textPreview: captions.text.substring(0, 200),
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[YouTube] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
