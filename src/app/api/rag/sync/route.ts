import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { createRag, uploadFileToRag } from "@/lib/straico";
import { getDownloadUrl } from "@/lib/s3";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * POST /api/rag/sync
 * 
 * Creates a Straico RAG base for a transcription and uploads transcript text.
 * If RAG base already exists, re-uploads the text (reindex).
 * 
 * Body: { transcriptionId, workspaceId }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { transcriptionId, workspaceId } = body;

    if (!transcriptionId || !workspaceId) {
      return NextResponse.json({ error: "transcriptionId and workspaceId required" }, { status: 400 });
    }

    // 1. Get transcription
    const tx = await ncb.readOne<any>("transcriptions", transcriptionId);
    if (!tx || tx.deleted_at) {
      return NextResponse.json({ error: "Transcription not found" }, { status: 404 });
    }

    if (tx.status !== "completed") {
      return NextResponse.json({ error: "Transcription must be completed before RAG sync" }, { status: 400 });
    }

    // 2. Get transcript text — from NCB preview or S3 artifact
    let transcriptText = tx.transcript_text || "";

    // If we have a text URL in S3, try to fetch full text
    if (tx.transcript_text_url && transcriptText.length < 500) {
      try {
        const textUrl = await getDownloadUrl(tx.transcript_text_url, 3600);
        const res = await fetch(textUrl);
        if (res.ok) {
          transcriptText = await res.text();
        }
      } catch (e) {
        console.warn("[RAG Sync] Could not fetch full text from S3:", e);
      }
    }

    if (!transcriptText || transcriptText.length < 10) {
      return NextResponse.json({ error: "No transcript text available for RAG indexing" }, { status: 400 });
    }

    // 3. Update status
    await ncb.update("transcriptions", transcriptionId, {
      rag_status: "syncing",
      updated_at: now(),
    });

    let ragBaseId = tx.rag_base_id;
    let straicoRagId: string | null = null;

    // 4. Check if RAG base already exists
    if (ragBaseId) {
      const existingRag = await ncb.readOne<any>("rag_bases", ragBaseId);
      if (existingRag && existingRag.straico_rag_id && !existingRag.deleted_at) {
        straicoRagId = existingRag.straico_rag_id;
      }
    }

    // 5. Create RAG base if not exists
    if (!straicoRagId) {
      const ragName = `TX-${transcriptionId}: ${tx.original_filename || "transcription"}`;
      const ragResult = await createRag(ragName, `Транскрипція: ${tx.original_filename || transcriptionId}`);
      straicoRagId = ragResult.id;

      // Save to NCB
      const ragRecord = await ncb.create("rag_bases", {
        workspace_id: workspaceId,
        owner_user_id: tx.app_user_id,
        straico_rag_id: straicoRagId,
        name: ragName,
        description: `Транскрипція: ${tx.original_filename}`,
        status: "active",
        created_at: now(),
        updated_at: now(),
      });
      ragBaseId = ragRecord.id;

      await ncb.update("transcriptions", transcriptionId, {
        rag_base_id: ragBaseId,
      });
    }

    // 6. Upload transcript text as file to RAG
    const textBlob = new Blob([transcriptText], { type: "text/plain" });
    const textUrl = URL.createObjectURL(textBlob);

    // Use direct upload via Straico API
    try {
      // Create a temporary text file and upload
      const formData = new FormData();
      formData.append("files", new Blob([transcriptText], { type: "text/plain" }), `transcript-${transcriptionId}.txt`);

      const config = { apiKey: process.env["STRAICO_API_KEY"] || "", apiUrl: "https://api.straico.com" };
      const uploadRes = await fetch(`${config.apiUrl}/v0/rag/${straicoRagId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Straico RAG upload failed: ${errText}`);
      }
    } catch (uploadError: any) {
      console.error("[RAG Sync] Upload error:", uploadError);
      await ncb.update("transcriptions", transcriptionId, {
        rag_status: "error",
        updated_at: now(),
      });
      return NextResponse.json({ error: `RAG upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // 7. Update status to synced
    await ncb.update("transcriptions", transcriptionId, {
      rag_status: "synced",
      rag_synced: 1,
      rag_synced_at: now(),
      updated_at: now(),
    });

    if (ragBaseId) {
      await ncb.update("rag_bases", ragBaseId, {
        status: "active",
        last_synced_at: now(),
        updated_at: now(),
      });
    }

    return NextResponse.json({
      ok: true,
      ragBaseId,
      straicoRagId,
      textLength: transcriptText.length,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[RAG Sync] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
