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
    response.headers.append("Set-Cookie", sc);
  }

  // Fallback for older Node versions
  if (setCookies.length === 0) {
    const sc = res.headers.get("set-cookie");
    if (sc) response.headers.set("Set-Cookie", sc);
  }

  return response;
}
