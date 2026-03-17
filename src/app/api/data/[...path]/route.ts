import { NextRequest, NextResponse } from "next/server";

/**
 * Data proxy: /api/data/[...path]
 * 
 * Proxies CRUD requests to NCB data API.
 * NCB Data API requires Instance as QUERY PARAM (not header).
 * 
 * Auto-maps HTTP methods to NCB operations:
 *   GET    /api/data/tablename       → NCB /read/tablename
 *   GET    /api/data/tablename/42    → NCB /read/tablename/42
 *   POST   /api/data/tablename       → NCB /create/tablename
 *   PUT    /api/data/tablename/42    → NCB /update/tablename/42
 *   DELETE /api/data/tablename/42    → NCB /delete/tablename/42
 *   POST   /api/data/search/table    → NCB /search/table (passthrough)
 * 
 * If path already starts with read/create/update/delete/search — passthrough.
 */

const NCB_OPS = ["read", "create", "update", "delete", "search"];

function buildNcbPath(method: string, path: string): string {
  // If path already starts with an NCB operation — passthrough
  const firstSegment = path.split("/")[0];
  if (NCB_OPS.includes(firstSegment)) return path;

  // Auto-map method to operation
  switch (method) {
    case "GET":    return `read/${path}`;
    case "POST":   return `create/${path}`;
    case "PUT":    return `update/${path}`;
    case "DELETE": return `delete/${path}`;
    default:       return `read/${path}`;
  }
}

async function proxyData(req: NextRequest, path: string) {
  const dataUrl = process.env["NCB_DATA_URL"] || "https://openapi.nocodebackend.com";
  const instance = process.env["NCB_INSTANCE"] || "";
  const secret = process.env["NCB_SECRET_KEY"] || "";

  const ncbPath = buildNcbPath(req.method, path);
  const url = new URL(`${dataUrl}/${ncbPath}`);

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
