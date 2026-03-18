import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { queryRag } from "@/lib/straico";
import { checkStraicoLimit, recordStraicoUsage, getWorkspaceLimits } from "@/lib/usage";

/**
 * POST /api/rag/query
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const cookie = ncb.getCookie(req);

    const body = await req.json() as any;
    const { workspaceId, question, conversationId, model, ragBaseId, transcriptionId } = body;

    if (!workspaceId || !question) {
      return NextResponse.json({ error: "workspaceId and question required" }, { status: 400 });
    }

    // 1. Check limit
    const usageCheck = await checkStraicoLimit(workspaceId);
    if (!usageCheck.allowed) {
      return NextResponse.json({ error: usageCheck.reason }, { status: 429 });
    }

    const wsLimits = await getWorkspaceLimits(workspaceId);
    const defaultModel = model || wsLimits?.default_model_id || "openai/gpt-4o-mini";

    // 2. Find RAG base — support both ragBaseId and transcriptionId
    let straicoRagId: string | null = null;

    if (ragBaseId) {
      const ragBase = await ncb.readOne<any>("rag_bases", ragBaseId);
      if (ragBase?.deleted_at) {
        return NextResponse.json({ error: "RAG base has been deleted" }, { status: 404 });
      }
      straicoRagId = ragBase?.straico_rag_id || null;
    }

    // If transcriptionId provided (from chat?transcription=X), find its RAG base
    if (!straicoRagId && transcriptionId) {
      const tx = await ncb.readOne<any>("transcriptions", transcriptionId);
      if (tx?.rag_base_id) {
        const ragBase = await ncb.readOne<any>("rag_bases", tx.rag_base_id);
        straicoRagId = ragBase?.straico_rag_id || null;
      }
    }

    // Fallback: find any active RAG base for workspace
    if (!straicoRagId) {
      const rags = await ncb.read<any>("rag_bases", {
        filters: { workspace_id: workspaceId },
        limit: 10,
      });
      const activeRag = (rags.data || []).find((r: any) => !r.deleted_at && r.straico_rag_id);
      straicoRagId = activeRag?.straico_rag_id || null;
    }

    if (!straicoRagId) {
      return NextResponse.json({ error: "No active RAG base found. Проіндексуйте транскрипцію спочатку." }, { status: 404 });
    }

    // 3. Get or create conversation (use cookie for RLS)
    let convId = conversationId;
    if (convId) {
      const existing = await ncb.readOne<any>("conversations", convId);
      if (!existing || existing.deleted_at) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    } else {
      const appUser = await ncb.findOne<any>("app_users", { workspace_id: workspaceId });
      const conv = await ncb.createAsUser("conversations", cookie, {
        workspace_id: workspaceId,
        owner_user_id: appUser?.id || 0,
        title: `RAG: ${question.slice(0, 80)}`,
      });
      convId = conv.id;
    }

    // 4. Save user message
    try {
      await ncb.createAsUser("messages", cookie, {
        conversation_id: convId,
        role: "user",
        content_text: question,
      });
    } catch (e) {
      console.warn("[RAG/Query] Save user message failed:", e);
    }

    // 5. Query Straico RAG
    const result = await queryRag(straicoRagId, question, defaultModel);

    // 6. Save assistant message
    try {
      await ncb.createAsUser("messages", cookie, {
        conversation_id: convId,
        role: "assistant",
        content_text: result.answer,
        rag_references_json: result.references?.length
          ? JSON.stringify(result.references) : null,
      });
    } catch (e) {
      console.warn("[RAG/Query] Save assistant message failed:", e);
    }

    // 7. Record usage (non-blocking)
    try {
      const estimatedCoins = 5;
      const appUser = await ncb.findOne<any>("app_users", { workspace_id: workspaceId });
      await recordStraicoUsage(workspaceId, appUser?.id || null, estimatedCoins, "rag_query", convId);
    } catch (e) {
      console.warn("[RAG/Query] Usage recording failed:", e);
    }

    return NextResponse.json({
      answer: result.answer,
      references: result.references,
      conversationId: convId,
      coinsUsed: 5,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[RAG/Query] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
