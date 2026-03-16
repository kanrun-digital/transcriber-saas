import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { getUsageSummary } from "@/lib/usage";

/**
 * GET /api/usage?workspaceId=123
 * Returns usage summary for the dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const workspaceId = Number(req.nextUrl.searchParams.get("workspaceId"));
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const summary = await getUsageSummary(workspaceId);
    if (!summary) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Usage] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
