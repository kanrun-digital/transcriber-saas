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

    const [textUrl, jsonUrl, srtUrl] = await Promise.all([
      tx.transcript_text_url ? getDownloadUrl(tx.transcript_text_url, expiresIn) : null,
      tx.transcript_json_url ? getDownloadUrl(tx.transcript_json_url, expiresIn) : null,
      tx.srt_url ? getDownloadUrl(tx.srt_url, expiresIn) : null,
    ]);

    return NextResponse.json({ textUrl, jsonUrl, srtUrl, expiresIn });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Artifacts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
