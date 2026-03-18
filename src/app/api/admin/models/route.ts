import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { listModels } from "@/lib/straico";

let modelsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

/**
 * GET /api/admin/models — list all Straico models
 */
export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    let models;
    if (modelsCache && Date.now() - modelsCache.timestamp < CACHE_TTL) {
      models = modelsCache.data;
    } else {
      models = await listModels();
      modelsCache = { data: models, timestamp: Date.now() };
    }

    const chat = (models.chat || []).map((m: any) => ({
      id: m.model || m.id || m.name,
      name: m.name,
      coins: m.pricing?.coins || 0,
      wordLimit: m.word_limit || 0,
      maxOutput: m.max_output || 0,
    }));

    const image = (models.image || []).map((m: any) => ({
      id: m.model || m.id || m.name,
      name: m.name,
      coins: m.pricing?.square?.coins || m.pricing?.coins || 0,
    }));

    return NextResponse.json({ chat, image, total: chat.length + image.length });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
