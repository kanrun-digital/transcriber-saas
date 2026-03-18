import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { listModels, getUserInfo } from "@/lib/straico";

/**
 * GET /api/models
 * 
 * Returns available models filtered by workspace plan + admin config.
 * Plan filtering: metadata_json.allowed_models or coins-based fallback.
 */

let modelsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

// Default model limits by plan (coins per 100 words)
const PLAN_LIMITS: Record<string, { maxChatCoins: number; maxImageCoins: number }> = {
  free: { maxChatCoins: 2, maxImageCoins: 120 },
  pro: { maxChatCoins: 20, maxImageCoins: 500 },
  enterprise: { maxChatCoins: 9999, maxImageCoins: 9999 },
};

export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    const type = req.nextUrl.searchParams.get("type") || "all";

    let plan = "free";
    let allowedModels: string[] | null = null;
    let blockedModels: string[] | null = null;
    let maxChatCoins = PLAN_LIMITS.free.maxChatCoins;
    let maxImageCoins = PLAN_LIMITS.free.maxImageCoins;

    if (workspaceId) {
      const ws = await ncb.readOne<any>("workspaces", Number(workspaceId));
      plan = ws?.plan || "free";

      // Read custom model config from workspace metadata
      try {
        const meta = ws?.metadata_json
          ? (typeof ws.metadata_json === "string" ? JSON.parse(ws.metadata_json) : ws.metadata_json)
          : {};
        if (meta.allowed_models && Array.isArray(meta.allowed_models)) {
          allowedModels = meta.allowed_models;
        }
        if (meta.blocked_models && Array.isArray(meta.blocked_models)) {
          blockedModels = meta.blocked_models;
        }
        if (meta.max_chat_coins) maxChatCoins = Number(meta.max_chat_coins);
        else maxChatCoins = PLAN_LIMITS[plan]?.maxChatCoins || 2;
        if (meta.max_image_coins) maxImageCoins = Number(meta.max_image_coins);
        else maxImageCoins = PLAN_LIMITS[plan]?.maxImageCoins || 120;
      } catch {}
    }

    // Get models (cached)
    let models;
    if (modelsCache && Date.now() - modelsCache.timestamp < CACHE_TTL) {
      models = modelsCache.data;
    } else {
      models = await listModels();
      modelsCache = { data: models, timestamp: Date.now() };
    }

    let chatModels = (models.chat || []).slice();
    let imageModels = (models.image || []).slice();

    // Filter by allowed/blocked lists (admin override)
    if (allowedModels) {
      chatModels = chatModels.filter((m: any) => allowedModels!.includes(m.model || m.id || m.name));
      imageModels = imageModels.filter((m: any) => allowedModels!.includes(m.model || m.id || m.name));
    } else {
      // Default: filter by coins limit per plan
      chatModels = chatModels.filter((m: any) => (m.pricing?.coins || 0) <= maxChatCoins);
      imageModels = imageModels.filter((m: any) => {
        const minCoins = Math.min(
          m.pricing?.square?.coins || 999,
          m.pricing?.landscape?.coins || 999,
          m.pricing?.portrait?.coins || 999
        );
        return minCoins <= maxImageCoins;
      });
    }

    // Remove blocked models
    if (blockedModels) {
      chatModels = chatModels.filter((m: any) => !blockedModels!.includes(m.model || m.id || m.name));
      imageModels = imageModels.filter((m: any) => !blockedModels!.includes(m.model || m.id || m.name));
    }

    // Get user coins
    let userCoins = 0;
    let userPlan = "";
    try {
      const info = await getUserInfo();
      userCoins = info.coins;
      userPlan = info.plan;
    } catch {}

    const result: Record<string, unknown> = { userCoins, userPlan };
    if (type === "chat" || type === "all") result.chat = chatModels;
    if (type === "image" || type === "all") result.image = imageModels;

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Models] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
