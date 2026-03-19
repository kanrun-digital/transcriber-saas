import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

/**
 * POST /api/admin/model-config
 * 
 * Set allowed/blocked models for a workspace.
 * Body: { workspaceId, allowedModels?: string[], blockedModels?: string[], maxChatCoins?: number }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { workspaceId, allowedModels, blockedModels, maxChatCoins } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const ws = await ncb.readOne<any>("workspaces", workspaceId);
    if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const existingMeta = ws.metadata_json
      ? (typeof ws.metadata_json === "string" ? JSON.parse(ws.metadata_json) : ws.metadata_json)
      : {};

    const newMeta = { ...existingMeta };
    if (allowedModels !== undefined) newMeta.allowed_models = allowedModels;
    if (blockedModels !== undefined) newMeta.blocked_models = blockedModels;
    if (maxChatCoins !== undefined) newMeta.max_chat_coins = maxChatCoins;

    await ncb.update("workspaces", workspaceId, {
      metadata_json: JSON.stringify(newMeta),
    });

    return NextResponse.json({ ok: true, metadata: newMeta });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
