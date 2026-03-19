import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { chatCompletion } from "@/lib/straico";
import { checkStraicoLimit, recordStraicoUsage, getWorkspaceLimits } from "@/lib/usage";

const DEFAULT_MAX_CHARS = 24000;
const DEFAULT_MAX_MESSAGES = 30;

function trimHistory(
  history: Array<{ role: string; content: string }>,
  maxChars: number,
  maxMessages: number
): Array<{ role: string; content: string }> {
  let totalChars = 0;
  const result: Array<{ role: string; content: string }> = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msgChars = history[i].content.length;
    if (totalChars + msgChars > maxChars) break;
    if (result.length >= maxMessages) break;
    totalChars += msgChars;
    result.unshift(history[i]);
  }
  return result;
}

async function generateTitle(message: string, model: string): Promise<string> {
  try {
    const titlePrompt = [
      { role: "system" as const, content: "Згенеруй короткий заголовок (3-7 слів) для чату. Відповідай ТІЛЬКИ заголовком, без лапок. Мова — та сама що й повідомлення." },
      { role: "user" as const, content: message.slice(0, 500) },
    ];
    const title = await chatCompletion(titlePrompt, model);
    return title.slice(0, 100).trim();
  } catch {
    return message.slice(0, 80);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const cookie = ncb.getCookie(req);
    const body = await req.json() as any;
    const { workspaceId, message, conversationId, model, systemPrompt, transcriptionId } = body;

    if (!workspaceId || !message) {
      return NextResponse.json({ error: "workspaceId and message required" }, { status: 400 });
    }

    const usageCheck = await checkStraicoLimit(workspaceId);
    if (!usageCheck.allowed) {
      return NextResponse.json({ error: usageCheck.reason }, { status: 429 });
    }

    const wsLimits = await getWorkspaceLimits(workspaceId);
    const selectedModel = model || wsLimits?.default_model_id || "openai/gpt-4o-mini";

    // Get context limit from workspace metadata
    let maxMessages = DEFAULT_MAX_MESSAGES;
    let maxChars = DEFAULT_MAX_CHARS;
    try {
      const ws = await ncb.readOne<any>("workspaces", workspaceId);
      if (ws?.metadata_json) {
        const meta = typeof ws.metadata_json === "string" ? JSON.parse(ws.metadata_json) : ws.metadata_json;
        if (meta.chat_context_messages) maxMessages = Number(meta.chat_context_messages);
        if (meta.chat_context_chars) maxChars = Number(meta.chat_context_chars);
      }
    } catch {}

    // If transcriptionId provided — load transcript text as context
    let transcriptContext: string | null = null;
    if (transcriptionId) {
      try {
        const tx = await ncb.readOne<any>("transcriptions", transcriptionId);
        if (tx?.transcript_text) {
          transcriptContext = tx.transcript_text;
        }
      } catch {}
    }

    let convId = conversationId;
    let history: Array<{ role: string; content: string }> = [];
    let isNewConversation = false;

    if (convId) {
      const existing = await ncb.readOne<any>("conversations", convId);
      if (!existing || existing.deleted_at) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      const msgs = await ncb.readAsUser<any>("messages", cookie, {
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
      const conv = await ncb.createAsUser("conversations", cookie, {
        workspace_id: workspaceId,
        owner_user_id: appUser?.id || 0,
        title: message.slice(0, 80),
      });
      convId = conv.id;
    }

    await ncb.createAsUser("messages", cookie, {
      conversation_id: convId,
      role: "user",
      content_text: message,
    });

    const trimmedHistory = trimHistory(history, maxChars, maxMessages);
    const allMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

    // Add transcript context as system prompt
    if (transcriptContext) {
      const contextPrompt = `Ти — AI асистент для аналізу транскрипцій. Нижче наданий текст транскрипції. Відповідай на питання українською мовою, базуючись на цьому тексті. Якщо відповіді немає в тексті — скажи про це.\n\n--- ТРАНСКРИПЦІЯ ---\n${transcriptContext.substring(0, 15000)}\n--- КІНЕЦЬ ТРАНСКРИПЦІЇ ---`;
      allMessages.push({ role: "system", content: contextPrompt });
    }

    if (systemPrompt && !transcriptContext) {
      allMessages.push({ role: "system", content: systemPrompt });
    }

    allMessages.push(...trimmedHistory.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })));
    allMessages.push({ role: "user", content: message });

    const answer = await chatCompletion(allMessages, selectedModel);

    await ncb.createAsUser("messages", cookie, {
      conversation_id: convId,
      role: "assistant",
      content_text: answer,
    });

    if (isNewConversation) {
      generateTitle(message, selectedModel).then(async (title: any) => {
        try { await ncb.update("conversations", convId, { title }); } catch {}
      });
    }

    const estimatedCoins = 3;
    try {
      const appUser = await ncb.findOne<any>("app_users", { workspace_id: workspaceId });
      await recordStraicoUsage(workspaceId, appUser?.id || null, estimatedCoins, "chat", convId);
    } catch {}

    return NextResponse.json({ answer, conversationId: convId, coinsUsed: estimatedCoins });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Chat] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
