import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { listModels, getUserInfo } from "@/lib/straico";

/**
 * GET /api/models
 * 
 * Returns available models filtered by workspace plan.
 * Caches Straico models list for 1 hour.
 * 
 * Query: ?workspaceId=30&type=chat|image|all
 * Returns: { chat: [...], image: [...], userCoins, userPlan }
 */

let modelsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    const type = req.nextUrl.searchParams.get("type") || "all";

    // Get workspace plan for filtering
    let plan = "free";
    if (workspaceId) {
      const ws = await ncb.readOne<any>("workspaces", Number(workspaceId));
      plan = ws?.plan || "free";
    }

    // Get models (cached)
    let models;
    if (modelsCache && Date.now() - modelsCache.timestamp < CACHE_TTL) {
      models = modelsCache.data;
    } else {
      models = await listModels();
      modelsCache = { data: models, timestamp: Date.now() };
    }

    // Filter by plan
    let chatModels = models.chat || [];
    let imageModels = models.image || [];

    if (plan === "free") {
      // Free: limit to budget models (< 2 coins per 100 words)
      chatModels = chatModels.filter((m: any) => {
        const coins = m.pricing?.coins || 0;
        return coins <= 2;
      });
      imageModels = imageModels.filter((m: any) => {
        const minCoins = Math.min(
          m.pricing?.square?.coins || 999,
          m.pricing?.landscape?.coins || 999,
          m.pricing?.portrait?.coins || 999
        );
        return minCoins <= 120;
      });
    } else if (plan === "pro") {
      // Pro: all models except o1-pro and premium (> 20 coins)
      chatModels = chatModels.filter((m: any) => {
        const coins = m.pricing?.coins || 0;
        return coins <= 20;
      });
    }
    // Enterprise: all models

    // Get user coins
    let userCoins = 0;
    let userPlan = "";
    try {
      const info = await getUserInfo();
      userCoins = info.coins;
      userPlan = info.plan;
    } catch { /* ignore */ }

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
