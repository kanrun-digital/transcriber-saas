import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

/**
 * POST /api/transcriptions/reset-rag
 * Reset stuck RAG indexation: { transcriptionId }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { transcriptionId } = body;

    if (!transcriptionId) {
      return NextResponse.json({ error: "transcriptionId required" }, { status: 400 });
    }

    await ncb.update("transcriptions", transcriptionId, {
      rag_status: "none",
      rag_synced: 0,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
