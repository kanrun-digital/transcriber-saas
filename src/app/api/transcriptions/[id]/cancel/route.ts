import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * POST /api/transcriptions/[id]/cancel
 * 
 * Cancels a stuck transcription and resets to "uploaded" so it can be restarted.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ncb.requireAuth(req);
    const { id } = await params;
    const txId = Number(id);

    const tx = await ncb.readOne<any>("transcriptions", txId);
    if (!tx || tx.deleted_at) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (tx.status !== "transcribing") {
      return NextResponse.json({ error: "Can only cancel transcribing jobs" }, { status: 400 });
    }

    // Reset to uploaded so user can restart with new settings
    await ncb.update("transcriptions", txId, {
      status: "uploaded",
      salad_job_id: null,
      error_message: null,
      updated_at: now(),
    });

    return NextResponse.json({ ok: true, message: "Transcription cancelled and reset to uploaded" });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Cancel] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
