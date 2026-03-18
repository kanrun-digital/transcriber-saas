import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

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
 * POST /api/rag/sync-project
 * 
 * Creates/updates a RAG base for an entire project.
 * Uploads all completed transcriptions as files.
 * Async — returns immediately.
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { projectId, workspaceId } = body;

    if (!projectId || !workspaceId) {
      return NextResponse.json({ error: "projectId and workspaceId required" }, { status: 400 });
    }

    const project = await ncb.readOne<any>("projects", projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all completed transcriptions in project
    const txResult = await ncb.read<any>("transcriptions", {
      filters: { project_id: projectId, status: "completed" },
      limit: 100,
    });
    const transcriptions = (txResult.data || []).filter((t: any) => !t.deleted_at);

    if (transcriptions.length === 0) {
      return NextResponse.json({ error: "No completed transcriptions in project" }, { status: 400 });
    }

    // Background processing
    const bgPromise = (async () => {
      const config = straicoConfig();

      try {
        // Collect all transcript texts
        const files: { name: string; text: string }[] = [];
        for (const tx of transcriptions) {
          const text = tx.transcript_text || "";
          if (text.length > 10) {
            files.push({
              name: `${tx.original_filename || `tx-${tx.id}`}.txt`,
              text,
            });
          }
        }

        if (files.length === 0) {
          return;
        }

        // Create RAG base with first file
        const formData = new FormData();
        formData.append("name", `Project: ${project.name}`);
        formData.append("description", `Проект "${project.name}" — ${files.length} транскрипцій`);
        formData.append("chunking_method", "recursive");
        formData.append("chunk_size", "1000");
        formData.append("chunk_overlap", "50");

        // Add all files
        for (const file of files) {
          formData.append("files", new Blob([file.text], { type: "text/plain" }), file.name);
        }

        const createRes = await fetch(`${config.apiUrl}/v0/rag`, {
          method: "POST",
          headers: { Authorization: `Bearer ${config.apiKey}` },
          body: formData,
        });

        if (!createRes.ok) {
          throw new Error(`Straico RAG create error: ${await createRes.text()}`);
        }

        const createData = await createRes.json();
        const straicoRagId = createData.data?._id || createData.data?.id;

        // Save RAG base in NCB
        const ragRecord = await ncb.create("rag_bases", {
          workspace_id: workspaceId,
          owner_user_id: project.owner_user_id,
          straico_rag_id: straicoRagId,
          name: `Project: ${project.name}`,
          description: `${files.length} транскрипцій`,
          status: "active",
          created_at: now(),
          updated_at: now(),
        });

        // Update all transcriptions with rag_base_id
        for (const tx of transcriptions) {
          await ncb.update("transcriptions", tx.id, {
            rag_base_id: ragRecord.id,
            rag_status: "synced",
            rag_synced: 1,
            rag_synced_at: now(),
            updated_at: now(),
          });
        }

      } catch (err: any) {
        console.error("[RAG Sync Project] Error:", err);
      }
    })();

    bgPromise.catch(() => {});

    return NextResponse.json({
      ok: true,
      status: "syncing",
      transcriptionCount: transcriptions.length,
      message: `RAG індексація ${transcriptions.length} транскрипцій запущена.`,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[RAG Sync Project] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
