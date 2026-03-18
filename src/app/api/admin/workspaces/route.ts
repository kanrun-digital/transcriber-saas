import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

/**
 * GET /api/admin/workspaces
 * 
 * Lists ALL workspaces (bypasses RLS by using server-side NCB read).
 * Admin-only.
 */
export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    // Read all workspaces — NCB server-side read with secret key bypasses RLS
    const result = await ncb.read<any>("workspaces", {
      limit: 200,
      sort: "created_at",
      order: "desc",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Admin Workspaces] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/workspaces
 * 
 * Update workspace plan/limits.
 */
export async function PUT(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    await ncb.update("workspaces", id, data);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Admin Workspaces] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
