import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { getDownloadUrl, buildTranscriptKey, buildTranscriptJsonKey, buildSrtKey, buildRagInputKey } from "@/lib/s3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ncb.requireAuth(req);
    const { id } = await params;

    const txId = Number(id);
    const tx = await ncb.readOne<any>("transcriptions", txId);

    if (!tx || tx.deleted_at) {
      return NextResponse.json({ error: "Transcription not found" }, { status: 404 });
    }

    if (tx.status !== "completed") {
      return NextResponse.json({ error: "Transcription not ready" }, { status: 400 });
    }

    const wsId = String(tx.workspace_id);
    const expiresIn = 3600;

    // Parse metadata_json for jsonS3Key (YouTube stores it there)
    let jsonS3Key: string | null = null;
    try {
      const meta = typeof tx.metadata_json === "string" ? JSON.parse(tx.metadata_json) : tx.metadata_json;
      if (meta?.jsonS3Key) jsonS3Key = meta.jsonS3Key;
    } catch {}

    const [textUrl, jsonUrl, srtUrl] = await Promise.all([
      tx.transcript_text_url ? getDownloadUrl(tx.transcript_text_url, expiresIn) : null,
      (tx.transcript_json_url || jsonS3Key) ? getDownloadUrl(tx.transcript_json_url || jsonS3Key, expiresIn) : null,
      (tx.srt_content_url || tx.srt_url) ? getDownloadUrl(tx.srt_content_url || tx.srt_url, expiresIn) : null,
    ]);

    return NextResponse.json({ textUrl, jsonUrl, srtUrl, expiresIn });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Artifacts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
