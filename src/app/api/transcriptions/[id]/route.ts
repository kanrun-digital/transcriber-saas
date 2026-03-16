import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { deleteFile, deleteTranscriptArtifacts } from "@/lib/s3";
import { deleteTranscriptionJob } from "@/lib/salad";
import { deleteRag } from "@/lib/straico";
import { releaseStorageUsage } from "@/lib/usage";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ncb.requireAuth(req);
    const { id } = await params;
    const tx = await ncb.readOne<any>("transcriptions", Number(id));
    if (!tx || tx.deleted_at) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(tx);
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const wsId = String(tx.workspace_id);
    const errors: string[] = [];
    let releasedBytes = 0;

    if (tx.salad_job_id && ["uploaded", "transcribing"].includes(tx.status)) {
      try { await deleteTranscriptionJob(tx.salad_job_id, tx.salad_mode || "full"); }
      catch (e: any) { errors.push(`Salad: ${e.message}`); }
    }

    if (tx.storage_path) {
      const r = await deleteFile(tx.storage_path);
      if (!r.success) errors.push(`S3 audio: ${r.error}`);
      if (tx.file_size_bytes) releasedBytes += tx.file_size_bytes;
    }

    const artifactErrors = await deleteTranscriptArtifacts(wsId, String(txId));
    errors.push(...artifactErrors);

    if (tx.rag_base_id) {
      try {
        const ragBase = await ncb.readOne<any>("rag_bases", tx.rag_base_id);
        if (ragBase?.straico_rag_id) {
          await deleteRag(ragBase.straico_rag_id);
        }
        await ncb.update("rag_bases", tx.rag_base_id, { deleted_at: now(), status: "deleted" });
      } catch (e: any) { errors.push(`RAG: ${e.message}`); }
    }

    if (tx.storage_file_id) {
      await ncb.update("storage_files", tx.storage_file_id, { storage_status: "deleted", deleted_at: now() });
    }
    if (tx.transcript_file_id) {
      await ncb.update("storage_files", tx.transcript_file_id, { storage_status: "deleted", deleted_at: now() });
    }

    await ncb.update("transcriptions", txId, {
      deleted_at: now(),
      updated_at: now(),
    });

    if (releasedBytes > 0) await releaseStorageUsage(tx.workspace_id, releasedBytes);

    console.log(`[Delete] tx=${txId}. Released ${releasedBytes}b. Errors: ${errors.length}`);
    return NextResponse.json({ ok: true, warnings: errors.length ? errors : undefined });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Delete] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

