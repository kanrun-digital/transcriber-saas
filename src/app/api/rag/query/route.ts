import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { queryRag } from "@/lib/straico";
import { checkStraicoLimit, recordStraicoUsage, getWorkspaceLimits } from "@/lib/usage";

/**
 * POST /api/rag/query
 * 
 * Query workspace RAG base (Straico).
 * Saves message to conversation, tracks usage.
 * Respects soft deletes on conversations & rag_bases.
 * Uses workspace default_model_id if not specified.
 * 
 * Body: { workspaceId, question, conversationId?, model?, ragBaseId? }
 * Returns: { answer, references, conversationId, coinsUsed }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const { workspaceId, question, conversationId, model, ragBaseId } = await req.json();

    if (!workspaceId || !question) {
      return NextResponse.json({ error: "workspaceId and question required" }, { status: 400 });
    }

    // 1. Check limit
    const usageCheck = await checkStraicoLimit(workspaceId);
    if (!usageCheck.allowed) {
      return NextResponse.json({
        error: usageCheck.reason,
        usage: { used: usageCheck.used, limit: usageCheck.limit, remaining: usageCheck.remaining },
      }, { status: 429 });
    }

    // Get workspace defaults
    const wsLimits = await getWorkspaceLimits(workspaceId);
    const defaultModel = model || wsLimits?.default_model_id || "openai/gpt-4o-mini";

    // 2. Find RAG base (exclude soft-deleted)
    let ragId: string | null = null;

    if (ragBaseId) {
      const ragBase = await ncb.readOne<any>("rag_bases", ragBaseId);
      if (ragBase?.deleted_at) {
        return NextResponse.json({ error: "RAG base has been deleted" }, { status: 404 });
      }
      ragId = ragBase?.straico_rag_id || null;
    } else {
      const rags = await ncb.search<any>("rag_bases", { workspace_id: workspaceId, status: "active" });
      const activeRag = rags.find((r: any) => !r.deleted_at);
      ragId = activeRag?.straico_rag_id || null;
    }

    if (!ragId) {
      return NextResponse.json({ error: "No active RAG base found" }, { status: 404 });
    }

    // 3. Get or create conversation (check soft delete)
    let convId = conversationId;
    if (convId) {
      const existing = await ncb.readOne<any>("conversations", convId);
      if (!existing || existing.deleted_at) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    } else {
      const appUser = await ncb.findOne<any>("app_users", { workspace_id: workspaceId });

      const conv = await ncb.create("conversations", {
        workspace_id: workspaceId,
        owner_user_id: appUser?.id || 0,
        title: question.slice(0, 100),
        provider: "straico",
        model_id: defaultModel,
        context_type: "rag_base",
        context_ref_id: String(ragBaseId || ""),
      });
      convId = conv.id;
    }

    // 4. Save user message
    await ncb.create("messages", {
      conversation_id: convId,
      role: "user",
      content_text: question,
    });

    // 5. Query Straico RAG
    const result = await queryRag(ragId, question, defaultModel);

    // 6. Save assistant message
    await ncb.create("messages", {
      conversation_id: convId,
      role: "assistant",
      content_text: result.answer,
      rag_references_json: result.references?.length
        ? JSON.stringify(result.references) : null,
    });

    // 7. Log Straico request
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    const straicoReq = await ncb.create("straico_requests", {
      workspace_id: workspaceId,
      conversation_id: convId,
      request_type: "rag_prompt",
      endpoint: `/v0/rag/${ragId}/prompt`,
      model_id: defaultModel,
      status: "completed",
      started_at: ts,
      finished_at: ts,
    });

    // 8. Record coins
    const estimatedCoins = 5;
    const appUser = await ncb.findOne<any>("app_users", { workspace_id: workspaceId });
    await recordStraicoUsage(workspaceId, appUser?.id || null, estimatedCoins, "rag_query", convId);

    await ncb.create("straico_usage", {
      request_id: straicoReq.id,
      workspace_id: workspaceId,
      app_user_id: appUser?.id || null,
      model_id: defaultModel,
      total_coins: estimatedCoins,
    });

    return NextResponse.json({
      answer: result.answer,
      references: result.references,
      conversationId: convId,
      coinsUsed: estimatedCoins,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[RAG/Query] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
