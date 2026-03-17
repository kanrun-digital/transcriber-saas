import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/provision
 * 
 * Auto-provision app_user + workspace + workspace_member
 * Called after first login when app_user doesn't exist yet.
 * 
 * NCB Data API requires Instance as QUERY PARAM (not header).
 * NCB Auth API requires X-Database-Instance as HEADER.
 */

function getInstance() {
  return String(process.env["NCB_INSTANCE"] || "");
}

function getSecret() {
  return String(process.env["NCB_SECRET_KEY"] || "");
}

function dataUrl() {
  return String(process.env["NCB_DATA_URL"] || "https://openapi.nocodebackend.com");
}

function ncbHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getSecret()}`,
  };
}

function appendInstance(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}Instance=${getInstance()}`;
}

async function ncbRead(table: string, filters: Record<string, string | number>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) params.set(k, String(v));
  params.set("limit", "1");
  const url = appendInstance(`${dataUrl()}/read/${table}?${params}`);
  const res = await fetch(url, { headers: ncbHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`NCB read ${table} failed (${res.status}): ${await res.text()}`);
  const result = await res.json();
  return result.data || [];
}

async function ncbCreate(table: string, data: Record<string, unknown>) {
  const url = appendInstance(`${dataUrl()}/create/${table}`);
  const res = await fetch(url, {
    method: "POST",
    headers: ncbHeaders(),
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NCB create ${table} failed (${res.status}): ${await res.text()}`);
  const result = await res.json();
  return { id: result.id || result.data?.id };
}

async function ncbReadOne(table: string, id: number) {
  const url = appendInstance(`${dataUrl()}/read/${table}/${id}`);
  const res = await fetch(url, { headers: ncbHeaders(), cache: "no-store" });
  if (!res.ok) return null;
  const result = await res.json();
  return result.data || result;
}

export async function POST(req: NextRequest) {
  try {
    const inst = getInstance();
    console.log("[provision] NCB_INSTANCE:", inst ? inst : "MISSING");

    const { ncbUserId, email, name } = await req.json();
    if (!ncbUserId || !email) {
      return NextResponse.json({ error: "Missing ncbUserId or email" }, { status: 400 });
    }

    // Check if app_user already exists
    const existing = await ncbRead("app_users", { ncb_user_id: ncbUserId });
    if (existing.length > 0) {
      const appUser = existing[0];
      const workspace = await ncbReadOne("workspaces", appUser.workspace_id);
      return NextResponse.json({ appUser, workspace });
    }

    // 1. Create workspace
    const wsResult = await ncbCreate("workspaces", {
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
    const auResult = await ncbCreate("app_users", {
      workspace_id: wsResult.id,
      ncb_user_id: ncbUserId,
      email,
      name: name || null,
      role: "owner",
      is_active: 1,
    });

    // 3. Create workspace_member
    await ncbCreate("workspace_members", {
      workspace_id: wsResult.id,
      app_user_id: auResult.id,
      role: "owner",
    });

    const appUser = await ncbReadOne("app_users", auResult.id);
    const workspace = await ncbReadOne("workspaces", wsResult.id);

    return NextResponse.json({ appUser, workspace, provisioned: true });
  } catch (error: any) {
    console.error("Provision error:", error);
    return NextResponse.json({ error: error.message || "Provision failed" }, { status: 500 });
  }
}
