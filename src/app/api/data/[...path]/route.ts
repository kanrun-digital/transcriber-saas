import { NextRequest, NextResponse } from "next/server";

/**
 * Data proxy: /api/data/[...path]
 * 
 * Proxies CRUD requests to NCB data API.
 * NCB Data API requires Instance as QUERY PARAM (not header).
 */

async function proxyData(req: NextRequest, path: string) {
  const dataUrl = process.env["NCB_DATA_URL"] || "https://openapi.nocodebackend.com";
  const instance = process.env["NCB_INSTANCE"] || "";
  const secret = process.env["NCB_SECRET_KEY"] || "";

  // Build target URL — append Instance as query param
  const url = new URL(`${dataUrl}/${path}`);
  
  // Copy existing query params from request
  req.nextUrl.searchParams.forEach((val, key) => {
    url.searchParams.set(key, val);
  });
  
  // Add Instance query param
  url.searchParams.set("Instance", instance);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
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

  const res = await fetch(url.toString(), fetchOptions);
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
