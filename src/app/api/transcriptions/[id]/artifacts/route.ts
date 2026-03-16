import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { getDownloadUrl, buildTranscriptKey, buildTranscriptJsonKey, buildSrtKey, buildRagInputKey } from "@/lib/s3";

/**
 * GET /api/transcriptions/[id]/artifacts
 * 
 * Generate presigned download URLs for S3 artifacts on demand.
 * S3 keys are stored in NCB, URLs are generated here (expire in 1 hour).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ncb.requireAuth(req);

    const txId = Number(params.id);
    const tx = await ncb.readOne<any>("transcriptions", txId);

    if (!tx || tx.deleted_at) {
      return NextResponse.json({ error: "Transcription not found" }, { status: 404 });
    }

    if (tx.status !== "completed") {
      return NextResponse.json({ error: "Transcription not ready" }, { status: 400 });
    }

    const wsId = String(tx.workspace_id);
    const id = String(txId);
    const expiresIn = 3600; // 1 hour

    const [textUrl, jsonUrl, srtUrl] = await Promise.all([
      tx.transcript_text_url ? getDownloadUrl(tx.transcript_text_url, expiresIn) : null,
      tx.transcript_json_url ? getDownloadUrl(tx.transcript_json_url, expiresIn) : null,
      tx.srt_url ? getDownloadUrl(tx.srt_url, expiresIn) : null,
    ]);

    return NextResponse.json({
      textUrl,
      jsonUrl,
      srtUrl,
      expiresIn,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Artifacts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
