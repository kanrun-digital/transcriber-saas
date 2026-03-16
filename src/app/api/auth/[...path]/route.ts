import { NextRequest, NextResponse } from "next/server";

const NCB_AUTH_URL = process.env.NCB_AUTH_URL || "https://app.nocodebackend.com/api/user-auth";
const NCB_INSTANCE = process.env.NCB_INSTANCE!;
const NCB_SECRET = process.env.NCB_SECRET_KEY!;

/**
 * Map frontend paths to NCB Auth API paths:
 *   sign-up   → sign-up/email
 *   sign-in   → sign-in/email
 *   session   → get-session
 *   sign-out  → sign-out
 */
function mapAuthPath(path: string): string {
  switch (path) {
    case "sign-up":
      return "sign-up/email";
    case "sign-in":
      return "sign-in/email";
    case "session":
      return "get-session";
    default:
      return path;
  }
}

async function proxyAuth(req: NextRequest, path: string) {
  const mappedPath = mapAuthPath(path);
  const url = `${NCB_AUTH_URL}/${mappedPath}`;

  const headers: Record<string, string> = {
    "X-Database-Instance": NCB_INSTANCE,
    Authorization: `Bearer ${NCB_SECRET}`,
  };

  const ct = req.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;

  const cookie = req.headers.get("cookie");
  if (cookie) headers["Cookie"] = cookie;

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    fetchOptions.body = await req.text();
  }

  const res = await fetch(url, fetchOptions);

  const body = await res.text();
  const response = new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });

  const setCookies = res.headers.getSetCookie?.() || [];
  for (const sc of setCookies) {
    response.headers.append("Set-Cookie", sc);
  }

  return response;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyAuth(req, path.join("/"));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyAuth(req, path.join("/"));
}
