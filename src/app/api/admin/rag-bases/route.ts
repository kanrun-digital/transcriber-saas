import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { deleteRag, listRags } from "@/lib/straico";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * GET /api/admin/rag-bases — list all RAG bases with owner info
 * DELETE /api/admin/rag-bases — delete RAG base {ragBaseId}
 */
export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const result = await ncb.read<any>("rag_bases", {
      limit: 200,
      sort: "created_at",
      order: "desc",
    });

    // Enrich with owner info
    const bases = result.data || [];
    const enriched = await Promise.all(bases.map(async (rag: any) => {
      let ownerEmail = "—";
      try {
        if (rag.owner_user_id) {
          const user = await ncb.readOne<any>("app_users", rag.owner_user_id);
          ownerEmail = user?.email || "—";
        }
      } catch {}
      return { ...rag, ownerEmail };
    }));

    return NextResponse.json({ data: enriched });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { ragBaseId } = body;

    if (!ragBaseId) {
      return NextResponse.json({ error: "ragBaseId required" }, { status: 400 });
    }

    const ragBase = await ncb.readOne<any>("rag_bases", ragBaseId);
    if (!ragBase) {
      return NextResponse.json({ error: "RAG base not found" }, { status: 404 });
    }

    // Delete from Straico
    if (ragBase.straico_rag_id) {
      try { await deleteRag(ragBase.straico_rag_id); } catch (e: any) {
        console.warn("[Admin RAG Delete] Straico error:", e.message);
      }
    }

    // Mark deleted in NCB
    await ncb.update("rag_bases", ragBaseId, {
      status: "deleted",
      deleted_at: now(),
      updated_at: now(),
    });

    // Reset transcriptions that used this RAG base
    const txs = await ncb.read<any>("transcriptions", {
      filters: { rag_base_id: ragBaseId },
      limit: 100,
    });
    for (const tx of (txs.data || [])) {
      await ncb.update("transcriptions", tx.id, {
        rag_status: "none",
        rag_synced: 0,
        rag_base_id: null,
        updated_at: now(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
