import { NextRequest, NextResponse } from "next/server";

const NCB_CONFIG = {
  instance: process.env["NCB_INSTANCE"] || "",
  apiUrl: process.env["NCB_AUTH_URL"] || "https://app.nocodebackend.com/api/user-auth",
  secretKey: process.env["NCB_SECRET_KEY"] || "",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join("/"));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join("/"), await req.text());
}

async function proxyRequest(req: NextRequest, path: string, body?: string) {
  const searchParams = req.nextUrl.search;
  const url = `${NCB_CONFIG.apiUrl}/${path}${searchParams}`;

  const res = await fetch(url, {
    method: req.method,
    headers: {
  "Content-Type": "application/json",
  "X-Database-Instance": NCB_CONFIG.instance,
  "Authorization": `Bearer ${NCB_CONFIG.secretKey}`,
  "Cookie": req.headers.get("cookie") || "",
  "Origin": process.env["NEXT_PUBLIC_APP_URL"] || req.nextUrl.origin,
  "Referer": (process.env["NEXT_PUBLIC_APP_URL"] || req.nextUrl.origin) + "/",
},
    body: body || undefined,
  });

  const data = await res.text();

  const response = new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });

  // Forward ALL Set-Cookie headers from NCB
  const setCookies = res.headers.getSetCookie?.() || [];
for (const sc of setCookies) {
  // Remove Domain= so cookie works on our domain
  const rewritten = sc.replace(/;\s*Domain=[^;]*/gi, "").replace(/__Secure-/g, "");
  response.headers.append("Set-Cookie", rewritten);
}
if (setCookies.length === 0) {
  const sc = res.headers.get("set-cookie");
  if (sc) {
    const rewritten = sc.replace(/;\s*Domain=[^;]*/gi, "").replace(/__Secure-/g, "");
    response.headers.set("Set-Cookie", rewritten);
  }
}

  // Fallback for older Node versions
  if (setCookies.length === 0) {
    const sc = res.headers.get("set-cookie");
    if (sc) response.headers.set("Set-Cookie", sc);
  }

  return response;
}
