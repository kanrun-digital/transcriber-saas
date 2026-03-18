import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { deleteRag } from "@/lib/straico";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * POST /api/rag/delete
 * 
 * Deletes RAG base from Straico and marks as deleted in NCB.
 * Body: { transcriptionId, workspaceId }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { transcriptionId } = body;

    if (!transcriptionId) {
      return NextResponse.json({ error: "transcriptionId required" }, { status: 400 });
    }

    const tx = await ncb.readOne<any>("transcriptions", transcriptionId);
    if (!tx || !tx.rag_base_id) {
      return NextResponse.json({ error: "No RAG base for this transcription" }, { status: 404 });
    }

    const ragBase = await ncb.readOne<any>("rag_bases", tx.rag_base_id);

    // Delete from Straico
    if (ragBase?.straico_rag_id) {
      try {
        await deleteRag(ragBase.straico_rag_id);
      } catch (e: any) {
        console.warn("[RAG Delete] Straico delete failed:", e.message);
      }
    }

    // Mark as deleted in NCB
    await ncb.update("rag_bases", tx.rag_base_id, {
      status: "deleted",
      deleted_at: now(),
      updated_at: now(),
    });

    // Reset transcription RAG status
    await ncb.update("transcriptions", transcriptionId, {
      rag_status: "none",
      rag_synced: 0,
      rag_synced_at: null,
      rag_base_id: null,
      updated_at: now(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[RAG Delete] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
