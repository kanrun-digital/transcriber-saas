import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * POST /api/audit/log
 * Record an audit event: { workspaceId, action, details?, resourceType?, resourceId? }
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { workspaceId, userId, action, details, resourceType, resourceId } = body;

    await ncb.create("usage_log", {
      workspace_id: workspaceId || 0,
      app_user_id: userId || null,
      usage_type: "audit",
      units: 0,
      unit_label: "event",
      ref_type: resourceType || action || "system",
      ref_id: resourceId || null,
      description: typeof details === "string" ? details : JSON.stringify(details || {}),
      created_at: now(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    // Non-blocking — don't fail on audit errors
    console.warn("[Audit] Error:", error.message);
    return NextResponse.json({ ok: true });
  }
}

/**
 * GET /api/audit/log?workspaceId=X&limit=50
 * Get audit log entries
 */
export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    const limit = Number(req.nextUrl.searchParams.get("limit") || 50);

    const result = await ncb.read<any>("usage_log", {
      filters: { workspace_id: Number(workspaceId) || 0, usage_type: "audit" },
      sort: "created_at",
      order: "desc",
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
