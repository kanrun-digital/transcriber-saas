import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { createRag, uploadFileToRag } from "@/lib/straico";
import { getDownloadUrl, buildRagInputKey } from "@/lib/s3";
import { checkRagBaseLimit } from "@/lib/usage";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await ncb.requireAuth(req);

    const txId = Number(id);
    const tx = await ncb.readOne<any>("transcriptions", txId);

    if (!tx || tx.deleted_at) {
      return NextResponse.json({ error: "Transcription not found" }, { status: 404 });
    }
    if (tx.status !== "completed") {
      return NextResponse.json({ error: "Transcription not ready" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    if (tx.rag_synced === 1 && tx.rag_status === "synced" && !force) {
      return NextResponse.json({
        error: "Already synced. Use { force: true } to re-sync.",
        ragBaseId: tx.rag_base_id,
        ragSyncedAt: tx.rag_synced_at,
      }, { status: 409 });
    }

    const wsId = String(tx.workspace_id);
    const ts = now();

    await ncb.update("transcriptions", txId, { rag_status: "syncing", updated_at: ts });

    const limitCheck = await checkRagBaseLimit(tx.workspace_id);

    let ragBaseId = tx.rag_base_id;
    let straicoRagId: string;

    if (ragBaseId && !force) {
      const existing = await ncb.readOne<any>("rag_bases", ragBaseId);
      if (existing && !existing.deleted_at && existing.straico_rag_id) {
        straicoRagId = existing.straico_rag_id;
      } else {
        ragBaseId = null;
      }
    }

    if (!ragBaseId || force) {
      if (!limitCheck.allowed && !ragBaseId) {
        await ncb.update("transcriptions", txId, { rag_status: "error", error_message: limitCheck.reason });
        return NextResponse.json({ error: limitCheck.reason }, { status: 429 });
      }

      const ragName = `${tx.original_filename || `Transcript #${txId}`}`;
      const straicoRag = await createRag(ragName, `Transcription ${txId} from workspace ${wsId}`);
      straicoRagId = straicoRag.id;

      const newRag = await ncb.create("rag_bases", {
        workspace_id: tx.workspace_id,
        owner_user_id: tx.app_user_id,
        straico_rag_id: straicoRagId,
        name: ragName,
        status: "active",
      });
      ragBaseId = newRag.id;

      const ws = await ncb.readOne<any>("workspaces", tx.workspace_id);
      if (ws?.straico_agent_id) {
        try {
          await ncb.create("agent_rag_links", {
            workspace_id: tx.workspace_id,
            agent_id: ws.straico_agent_id,
            rag_base_id: ragBaseId,
          });
        } catch (e) {
          console.warn(`[Reindex] agent_rag_links create failed (may exist):`, e);
        }
      }
    }

    const ragInputUrl = await getDownloadUrl(buildRagInputKey(wsId, String(txId)), 7200);

    await uploadFileToRag(
      straicoRagId!,
      ragInputUrl,
      `transcript-${txId}-${tx.original_filename || "audio"}.txt`
    );

    await ncb.update("transcriptions", txId, {
      rag_synced: 1,
      rag_status: "synced",
      rag_synced_at: ts,
      rag_base_id: ragBaseId,
      updated_at: ts,
    });

    await ncb.update("rag_bases", ragBaseId, { last_synced_at: ts, updated_at: ts });

    return NextResponse.json({
      ok: true,
      ragBaseId,
      straicoRagId: straicoRagId!,
      message: force ? "Re-indexed to RAG" : "Synced to RAG",
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    try {
      await ncb.update("transcriptions", Number(id), {
        rag_status: "error",
        error_message: error.message,
      });
    } catch {}
    console.error("[Reindex] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
