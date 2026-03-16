import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

/**
 * POST /api/auth/provision
 * 
 * Auto-provision app_user + workspace + workspace_member
 * Called after first login when app_user doesn't exist yet.
 * 
 * Body: { ncbUserId, email, name }
 */
export async function POST(req: NextRequest) {
  try {
    const { ncbUserId, email, name } = await req.json();

    if (!ncbUserId || !email) {
      return NextResponse.json({ error: "Missing ncbUserId or email" }, { status: 400 });
    }

    // Check if app_user already exists
    const existingUser = await ncb.findOne<any>("app_users", { ncb_user_id: ncbUserId });

    if (existingUser) {
      const appUser = existingUser;

      const workspace = await ncb.readOne<any>("workspaces", appUser.workspace_id);
      return NextResponse.json({ appUser, workspace });
    }

    // 1. Create workspace
    const wsResult = await ncb.create("workspaces", {
      name: `${name || email.split("@")[0]}'s Workspace`,
      slug: email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-"),
      plan: "free",
      status: "active",
      salad_minutes_limit: 60,
      salad_minutes_used: 0,
      straico_coins_limit: 100,
      straico_coins_used: 0,
      max_file_size_mb: 500,
      max_storage_gb: 5,
      storage_used_bytes: 0,
      active_member_count: 1,
      user_id: ncbUserId,
    });

    // 2. Create app_user
    const auResult = await ncb.create("app_users", {
      workspace_id: wsResult.id,
      ncb_user_id: ncbUserId,
      email: email,
      name: name || null,
      role: "owner",
      is_active: 1,
    });

    // 3. Create workspace_member
    await ncb.create("workspace_members", {
      workspace_id: wsResult.id,
      app_user_id: auResult.id,
      role: "owner",
    });

    // Read back full objects
    const appUser = await ncb.readOne<any>("app_users", auResult.id);
    const workspace = await ncb.readOne<any>("workspaces", wsResult.id);

    return NextResponse.json({ appUser, workspace, provisioned: true });
  } catch (error: any) {
    console.error("Provision error:", error);
    return NextResponse.json(
      { error: error.message || "Provision failed" },
      { status: 500 }
    );
  }
}
