import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { chatCompletion } from "@/lib/straico";
import { checkStraicoLimit, recordStraicoUsage, getWorkspaceLimits } from "@/lib/usage";

/**
 * POST /api/chat
 * 
 * Simple chat with Straico model (no RAG).
 * Saves messages to conversation, tracks usage.
 * 
 * Body: { workspaceId, message, conversationId?, model?, systemPrompt? }
 * Returns: { answer, conversationId, coinsUsed }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const { workspaceId, message, conversationId, model, systemPrompt } = await req.json();

    if (!workspaceId || !message) {
      return NextResponse.json({ error: "workspaceId and message required" }, { status: 400 });
    }

    // 1. Check limit
    const usageCheck = await checkStraicoLimit(workspaceId);
    if (!usageCheck.allowed) {
      return NextResponse.json({ error: usageCheck.reason }, { status: 429 });
    }

    const wsLimits = await getWorkspaceLimits(workspaceId);
    const selectedModel = model || wsLimits?.default_model_id || "openai/gpt-4o-mini";

    // 2. Get or create conversation
    let convId = conversationId;
    let history: Array<{ role: string; content: string }> = [];

    if (convId) {
      const existing = await ncb.readOne<any>("conversations", convId);
      if (!existing || existing.deleted_at) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      // Load recent messages for context
      const msgs = await ncb.read<any>("messages", {
        filters: { conversation_id: convId },
        sort: "created_at",
        order: "desc",
        limit: 20,
      });
      history = (msgs.data || []).reverse().map((m: any) => ({
        role: m.role,
        content: m.content_text || "",
      }));
    } else {
      const appUser = await ncb.findOne<any>("app_users", { workspace_id: workspaceId });
      const conv = await ncb.create("conversations", {
        workspace_id: workspaceId,
        owner_user_id: appUser?.id || 0,
        title: message.slice(0, 100),
        provider: "straico",
        model_id: selectedModel,
        context_type: "chat",
      });
      convId = conv.id;
    }

    // 3. Save user message
    await ncb.create("messages", {
      conversation_id: convId,
      role: "user",
      content_text: message,
    });

    // 4. Build messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push(...history.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })));
    messages.push({ role: "user", content: message });

    // 5. Call Straico
    const answer = await chatCompletion(messages, selectedModel);

    // 6. Save assistant message
    await ncb.create("messages", {
      conversation_id: convId,
      role: "assistant",
      content_text: answer,
    });

    // 7. Record usage
    const estimatedCoins = 3;
    try {
      const appUser = await ncb.findOne<any>("app_users", { workspace_id: workspaceId });
      await recordStraicoUsage(workspaceId, appUser?.id || null, estimatedCoins, "chat", convId);
    } catch (e) { console.warn("[Chat] Usage recording failed:", e); }

    return NextResponse.json({
      answer,
      conversationId: convId,
      coinsUsed: estimatedCoins,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Chat] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
