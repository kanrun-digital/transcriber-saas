import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { getDownloadUrl } from "@/lib/s3";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function straicoConfig() {
  return {
    apiKey: process.env["STRAICO_API_KEY"] || "",
    apiUrl: "https://api.straico.com",
  };
}

/**
 * POST /api/rag/sync
 * 
 * Creates a Straico RAG base with transcript text file.
 * If RAG base already exists, uploads new file (reindex).
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { transcriptionId, workspaceId } = body;

    if (!transcriptionId || !workspaceId) {
      return NextResponse.json({ error: "transcriptionId and workspaceId required" }, { status: 400 });
    }

    const tx = await ncb.readOne<any>("transcriptions", transcriptionId);
    if (!tx || tx.deleted_at) {
      return NextResponse.json({ error: "Transcription not found" }, { status: 404 });
    }

    if (tx.status !== "completed") {
      return NextResponse.json({ error: "Transcription must be completed" }, { status: 400 });
    }

    // Get transcript text
    let transcriptText = tx.transcript_text || "";

    if (tx.transcript_text_url && transcriptText.length < 500) {
      try {
        const textUrl = await getDownloadUrl(tx.transcript_text_url, 3600);
        const res = await fetch(textUrl);
        if (res.ok) transcriptText = await res.text();
      } catch (e) {
        console.warn("[RAG Sync] Could not fetch full text from S3:", e);
      }
    }

    if (!transcriptText || transcriptText.length < 10) {
      return NextResponse.json({ error: "No transcript text available" }, { status: 400 });
    }

    await ncb.update("transcriptions", transcriptionId, {
      rag_status: "syncing",
      updated_at: now(),
    });

    const config = straicoConfig();
    let ragBaseId = tx.rag_base_id;
    let straicoRagId: string | null = null;

    // Check existing RAG base
    if (ragBaseId) {
      const existingRag = await ncb.readOne<any>("rag_bases", ragBaseId);
      if (existingRag && existingRag.straico_rag_id && !existingRag.deleted_at) {
        straicoRagId = existingRag.straico_rag_id;
      }
    }

    const textBlob = new Blob([transcriptText], { type: "text/plain" });
    const filename = `transcript-${transcriptionId}.txt`;

    if (!straicoRagId) {
      // Create RAG with file in one step
      const formData = new FormData();
      formData.append("name", `TX-${transcriptionId}: ${tx.original_filename || "transcription"}`);
      formData.append("description", `Транскрипція: ${tx.original_filename || transcriptionId}`);
      formData.append("chunking_method", "recursive");
      formData.append("chunk_size", "1000");
      formData.append("chunk_overlap", "50");
      formData.append("files", textBlob, filename);

      const createRes = await fetch(`${config.apiUrl}/v0/rag`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: formData,
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("[RAG Sync] Create error:", errText);
        await ncb.update("transcriptions", transcriptionId, { rag_status: "error", updated_at: now() });
        return NextResponse.json({ error: `Straico RAG create error: ${errText}` }, { status: 500 });
      }

      const createData = await createRes.json();
      straicoRagId = createData.data?._id || createData.data?.id;

      // Save to NCB
      const ragRecord = await ncb.create("rag_bases", {
        workspace_id: workspaceId,
        owner_user_id: tx.app_user_id,
        straico_rag_id: straicoRagId,
        name: `TX-${transcriptionId}: ${tx.original_filename || "transcription"}`,
        description: `Транскрипція: ${tx.original_filename}`,
        status: "active",
        created_at: now(),
        updated_at: now(),
      });
      ragBaseId = ragRecord.id;

      await ncb.update("transcriptions", transcriptionId, { rag_base_id: ragBaseId });
    } else {
      // Reindex: upload new file to existing RAG
      const formData = new FormData();
      formData.append("files", textBlob, filename);

      const uploadRes = await fetch(`${config.apiUrl}/v0/rag/${straicoRagId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error("[RAG Sync] Upload error:", errText);
        await ncb.update("transcriptions", transcriptionId, { rag_status: "error", updated_at: now() });
        return NextResponse.json({ error: `RAG upload failed: ${errText}` }, { status: 500 });
      }
    }

    // Update status
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
