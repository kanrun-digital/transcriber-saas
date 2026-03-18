import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { chatCompletion } from "@/lib/straico";
import { checkStraicoLimit, recordStraicoUsage, getWorkspaceLimits } from "@/lib/usage";

const MAX_CONTEXT_CHARS = 24000; // ~6000 tokens, safe for most models
const MAX_CONTEXT_MESSAGES = 30;

/**
 * Trim history to fit within token budget.
 * Keeps most recent messages, drops oldest first.
 */
function trimHistory(history: Array<{ role: string; content: string }>): Array<{ role: string; content: string }> {
  let totalChars = 0;
  const result: Array<{ role: string; content: string }> = [];

  // Walk from newest to oldest
  for (let i = history.length - 1; i >= 0; i--) {
    const msgChars = history[i].content.length;
    if (totalChars + msgChars > MAX_CONTEXT_CHARS) break;
    if (result.length >= MAX_CONTEXT_MESSAGES) break;
    totalChars += msgChars;
    result.unshift(history[i]);
  }

  return result;
}

/**
 * Generate a short title from the first user message.
 */
async function generateTitle(message: string, model: string): Promise<string> {
  try {
    const titlePrompt = [
      { role: "system" as const, content: "Згенеруй короткий заголовок (3-7 слів) для чату на основі першого повідомлення. Відповідай ТІЛЬКИ заголовком, без лапок, без пояснень. Мова — та сама що й повідомлення." },
      { role: "user" as const, content: message.slice(0, 500) },
    ];
    const title = await chatCompletion(titlePrompt, model);
    return title.slice(0, 100).trim();
  } catch {
    return message.slice(0, 80);
  }
}

/**
 * POST /api/chat
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const body = await req.json() as any;
    const { workspaceId, message, conversationId, model, systemPrompt } = body;

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
    let isNewConversation = false;

    if (convId) {
      const existing = await ncb.readOne<any>("conversations", convId);
      if (!existing || existing.deleted_at) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      const msgs = await ncb.read<any>("messages", {
        filters: { conversation_id: convId },
        sort: "created_at",
        order: "desc",
        limit: 50,
      });
      history = (msgs.data || []).reverse().map((m: any) => ({
        role: m.role,
        content: m.content_text || "",
      }));
    } else {
      isNewConversation = true;
      const appUser = await ncb.findOne<any>("app_users", { workspace_id: workspaceId });
      const conv = await ncb.create("conversations", {
        workspace_id: workspaceId,
        owner_user_id: appUser?.id || 0,
        title: message.slice(0, 80), // temporary, will update after AI response
      });
      convId = conv.id;
    }

    // 3. Save user message
    await ncb.create("messages", {
      conversation_id: convId,
      role: "user",
      content_text: message,
    });

    // 4. Build messages array with context limit
    const trimmedHistory = trimHistory(history);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push(...trimmedHistory.map(m => ({
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

    // 7. Auto-generate title for new conversations (async, non-blocking)
    if (isNewConversation) {
      generateTitle(message, selectedModel).then(async (title) => {
        try {
          await ncb.update("conversations", convId, { title });
        } catch {}
      });
    }

    // 8. Record usage
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
