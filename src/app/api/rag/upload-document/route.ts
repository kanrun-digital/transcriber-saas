import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

function straicoConfig() {
  return {
    apiKey: process.env["STRAICO_API_KEY"] || "",
    apiUrl: "https://api.straico.com",
  };
}

/**
 * POST /api/rag/upload-document
 * 
 * Upload a text document to an existing RAG base.
 * Body: { ragBaseId, content, filename, workspaceId }
 * 
 * OR create new RAG base with document:
 * Body: { content, filename, workspaceId, ragName?, projectId? }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { ragBaseId, content, filename, workspaceId, ragName, projectId } = body;

    if (!content || !workspaceId) {
      return NextResponse.json({ error: "content and workspaceId required" }, { status: 400 });
    }

    if (content.length < 10) {
      return NextResponse.json({ error: "Document too short" }, { status: 400 });
    }

    const config = straicoConfig();
    const textBlob = new Blob([content], { type: "text/plain" });
    const fname = filename || `document-${Date.now()}.txt`;

    let straicoRagId: string | null = null;
    let ncbRagBaseId = ragBaseId;

    if (ragBaseId) {
      // Upload to existing RAG base
      const ragBase = await ncb.readOne<any>("rag_bases", ragBaseId);
      if (!ragBase || ragBase.deleted_at) {
        return NextResponse.json({ error: "RAG base not found" }, { status: 404 });
      }
      straicoRagId = ragBase.straico_rag_id;

      if (!straicoRagId) {
        return NextResponse.json({ error: "RAG base has no Straico ID" }, { status: 400 });
      }

      // Upload file to existing RAG
      const formData = new FormData();
      formData.append("files", textBlob, fname);

      const uploadRes = await fetch(`${config.apiUrl}/v0/rag/${straicoRagId}/file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        return NextResponse.json({ error: `Upload failed: ${await uploadRes.text()}` }, { status: 500 });
      }

    } else {
      // Create new RAG base with document
      const name = ragName || `Document: ${fname}`;

      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", `Документ: ${fname} (${content.length} символів)`);
      formData.append("chunking_method", "recursive");
      formData.append("chunk_size", "1000");
      formData.append("chunk_overlap", "50");
      formData.append("files", textBlob, fname);

      const createRes = await fetch(`${config.apiUrl}/v0/rag`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: formData,
      });

      if (!createRes.ok) {
        return NextResponse.json({ error: `RAG create failed: ${await createRes.text()}` }, { status: 500 });
      }

      const createData = await createRes.json();
      straicoRagId = createData.data?._id || createData.data?.id;

      // Save to NCB
      const appUser = await ncb.findOne<any>("app_users", { workspace_id: workspaceId });
      const ragRecord = await ncb.create("rag_bases", {
        workspace_id: workspaceId,
        owner_user_id: appUser?.id || 0,
        straico_rag_id: straicoRagId,
        name,
        description: `Документ: ${fname}`,
        status: "active",
        created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
        updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
      ncbRagBaseId = ragRecord.id;
    }

    return NextResponse.json({
      ok: true,
      ragBaseId: ncbRagBaseId,
      straicoRagId,
      filename: fname,
      contentLength: content.length,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[RAG Upload Doc] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
