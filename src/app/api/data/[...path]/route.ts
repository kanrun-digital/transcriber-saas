import { NextRequest, NextResponse } from "next/server";

const NCB_DATA_URL = process.env.NCB_DATA_URL || "https://openapi.nocodebackend.com";
const NCB_INSTANCE = process.env.NCB_INSTANCE!;
const NCB_SECRET = process.env.NCB_SECRET_KEY!;

/**
 * Data proxy: /api/data/[...path]
 * 
 * Proxies CRUD requests to NCB data API.
 * Forwards user cookies for RLS enforcement.
 * 
 * Examples:
 *   GET  /api/data/read/transcriptions?workspace_id=1&status=completed
 *   POST /api/data/create/transcriptions
 *   PUT  /api/data/update/transcriptions/42
 *   DELETE /api/data/delete/transcriptions/42
 *   POST /api/data/search/transcriptions
 */

async function proxyData(req: NextRequest, path: string) {
  // Build target URL with query params
  const search = req.nextUrl.search;
  const url = `${NCB_DATA_URL}/${path}${search}`;

  const headers: Record<string, string> = {
    "X-Database-Instance": NCB_INSTANCE,
    Authorization: `Bearer ${NCB_SECRET}`,
  };

  const ct = req.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;

  // Forward cookies for RLS
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

  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyData(req, path.join("/"));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyData(req, path.join("/"));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyData(req, path.join("/"));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyData(req, path.join("/"));
}

