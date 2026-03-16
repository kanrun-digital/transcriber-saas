import { NextRequest, NextResponse } from "next/server";

const NCB_AUTH_URL = process.env.NCB_AUTH_URL || "https://app.nocodebackend.com/api/user-auth";
const NCB_INSTANCE = process.env.NCB_INSTANCE!;
const NCB_SECRET = process.env.NCB_SECRET_KEY!;

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

/**
 * Rewrite NCB cookies to work on our domain:
 * - Remove Domain=app.nocodebackend.com
 * - Remove __Secure- prefix (requires exact domain match)
 * - Remove Secure in development
 */
function rewriteCookie(cookie: string): string {
  let rewritten = cookie;
  // Remove Domain=... so browser defaults to our domain
  rewritten = rewritten.replace(/;\s*Domain=[^;]*/gi, "");
  // Remove __Secure- prefix — it requires Secure + exact domain
  rewritten = rewritten.replace(/__Secure-/g, "");
  return rewritten;
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

  // Forward cookies — remap our cookie names back to NCB names
  const cookie = req.headers.get("cookie");
  if (cookie) {
    // Our cookies are without __Secure- prefix, NCB expects with prefix
    const remapped = cookie
      .replace(/better-auth\.session_token/g, "__Secure-better-auth.session_token")
      .replace(/better-auth\.session_data/g, "__Secure-better-auth.session_data");
    headers["Cookie"] = remapped;
  }

  // NCB requires Origin header
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  headers["Origin"] = origin;
  headers["Referer"] = origin + "/";

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

  // Rewrite Set-Cookie headers so they work on our domain
  const setCookies = res.headers.getSetCookie?.() || [];
  for (const sc of setCookies) {
    response.headers.append("Set-Cookie", rewriteCookie(sc));
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
