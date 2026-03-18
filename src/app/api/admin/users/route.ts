import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

/**
 * GET /api/admin/users
 * Lists ALL users across ALL workspaces with workspace name.
 */
export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const result = await ncb.read<any>("app_users", {
      limit: 500,
      sort: "created_at",
      order: "desc",
    });

    const users = result.data || [];

    // Enrich with workspace name
    const wsCache = new Map<number, string>();
    const enriched = await Promise.all(users.map(async (user: any) => {
      let workspaceName = "—";
      if (user.workspace_id) {
        if (wsCache.has(user.workspace_id)) {
          workspaceName = wsCache.get(user.workspace_id) || "—";
        } else {
          try {
            const ws = await ncb.readOne<any>("workspaces", user.workspace_id);
            workspaceName = ws?.name || "—";
            wsCache.set(user.workspace_id, workspaceName);
          } catch {}
        }
      }
      return { ...user, workspaceName };
    }));

    return NextResponse.json({ data: enriched });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
