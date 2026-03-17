/**
 * NCB (NoCodeBackend) — DRY HTTP utility
 * 
 * Data CRUD API: https://openapi.nocodebackend.com  — Instance as QUERY PARAM
 * Auth API:      https://app.nocodebackend.com/api/user-auth  — Instance as HEADER
 * Instance:      55446_crm_transcriber_system
 */

// Read env at runtime
const _env = process.env;
function env() {
  return {
    dataUrl: _env["NCB_DATA_URL"] || "https://openapi.nocodebackend.com",
    authUrl: _env["NCB_AUTH_URL"] || "https://app.nocodebackend.com/api/user-auth",
    instance: _env["NCB_INSTANCE"] || "",
    secret: _env["NCB_SECRET_KEY"] || "",
  };
}

// ============ Headers ============

/** Headers for Data API — NO Instance header (goes in query) */
function dataHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env().secret}`,
  };
}

/** Headers for Auth API — Instance in header */
function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Database-Instance": env().instance,
    Authorization: `Bearer ${env().secret}`,
  };
}

function userAuthHeaders(cookie: string): Record<string, string> {
  return {
    ...authHeaders(),
    Cookie: cookie,
  };
}

function userDataHeaders(cookie: string): Record<string, string> {
  return {
    ...dataHeaders(),
    Cookie: cookie,
  };
}

/** Append Instance query param to URL */
function withInstance(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}Instance=${env().instance}`;
}

// ============ Types ============

export interface NcbListOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  includeTotal?: boolean;
  filters?: Record<string, string | number>;
}

export interface NcbListResult<T = any> {
  data: T[];
  total?: number;
  totalPages?: number;
}

export interface NcbSession {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

// ============ Auth ============

export async function getSession(cookie: string): Promise<NcbSession | null> {
  try {
    const res = await fetch(`${env().authUrl}/get-session`, {
      headers: userAuthHeaders(cookie),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? data : null;
  } catch {
    return null;
  }
}

// ============ CRUD (server-side, no user cookie) ============

export async function create<T extends Record<string, unknown>>(
  table: string,
  data: T
): Promise<{ id: number }> {
  const url = withInstance(`${env().dataUrl}/create/${table}`);
  const res = await fetch(url, {
    method: "POST",
    headers: dataHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NCB create ${table} failed (${res.status}): ${err}`);
  }
  const result = await res.json();
  return { id: result.id || result.data?.id };
}

export async function readOne<T = any>(
  table: string,
  id: number | string
): Promise<T | null> {
  const url = withInstance(`${env().dataUrl}/read/${table}/${id}`);
  const res = await fetch(url, { headers: dataHeaders() });
  if (!res.ok) return null;
  const result = await res.json();
  return result.data || result;
}

export async function read<T = any>(
  table: string,
  options?: NcbListOptions
): Promise<NcbListResult<T>> {
  const params = new URLSearchParams();
  params.set("Instance", env().instance);
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.sort) params.set("sort", options.sort);
  if (options?.order) params.set("order", options.order);
  if (options?.includeTotal) params.set("includeTotal", "true");
  if (options?.filters) {
    for (const [key, val] of Object.entries(options.filters)) {
      params.set(key, String(val));
    }
  }

  const url = `${env().dataUrl}/read/${table}?${params}`;
  const res = await fetch(url, { headers: dataHeaders() });
  if (!res.ok) {
    throw new Error(`NCB read ${table} failed (${res.status}): ${await res.text()}`);
  }

  const result = await res.json();
  return {
    data: result.data || [],
    total: result.total,
    totalPages: result.totalPages,
  };
}

export async function search<T = any>(
  table: string,
  body: Record<string, unknown>
): Promise<T[]> {
  const url = withInstance(`${env().dataUrl}/search/${table}`);
  const res = await fetch(url, {
    method: "POST",
    headers: dataHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`NCB search ${table} failed (${res.status}): ${await res.text()}`);
  }
  const result = await res.json();
  return result.data || [];
}

export async function update(
  table: string,
  id: number | string,
  data: Record<string, unknown>
): Promise<void> {
  const url = withInstance(`${env().dataUrl}/update/${table}/${id}`);
  const res = await fetch(url, {
    method: "PUT",
    headers: dataHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(`[NCB] Update ${table}/${id} failed:`, await res.text());
  }
}

export async function remove(table: string, id: number | string): Promise<void> {
  const url = withInstance(`${env().dataUrl}/delete/${table}/${id}`);
  const res = await fetch(url, {
    method: "DELETE",
    headers: dataHeaders(),
  });
  if (!res.ok) {
    console.error(`[NCB] Delete ${table}/${id} failed:`, await res.text());
  }
}

// ============ User-scoped CRUD (with cookie for RLS) ============

export async function readAsUser<T = any>(
  table: string,
  cookie: string,
  options?: NcbListOptions
): Promise<NcbListResult<T>> {
  const params = new URLSearchParams();
  params.set("Instance", env().instance);
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.sort) params.set("sort", options.sort);
  if (options?.order) params.set("order", options.order);
  if (options?.includeTotal) params.set("includeTotal", "true");
  if (options?.filters) {
    for (const [key, val] of Object.entries(options.filters)) {
      params.set(key, String(val));
    }
  }

  const url = `${env().dataUrl}/read/${table}?${params}`;
  const res = await fetch(url, { headers: userDataHeaders(cookie) });
  if (!res.ok) {
    throw new Error(`NCB read ${table} failed (${res.status})`);
  }

  const result = await res.json();
  return {
    data: result.data || [],
    total: result.total,
    totalPages: result.totalPages,
  };
}

export async function createAsUser(
  table: string,
  cookie: string,
  data: Record<string, unknown>
): Promise<{ id: number }> {
  const url = withInstance(`${env().dataUrl}/create/${table}`);
  const res = await fetch(url, {
    method: "POST",
    headers: userDataHeaders(cookie),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`NCB create ${table} failed (${res.status}): ${await res.text()}`);
  }
  const result = await res.json();
  return { id: result.id || result.data?.id };
}

// ============ Helpers ============

export async function findOne<T = any>(
  table: string,
  filters: Record<string, string | number>
): Promise<T | null> {
  const result = await read<T>(table, { filters, limit: 1 });
  return result.data[0] || null;
}

export function getCookie(req: Request): string {
  return req.headers.get("cookie") || "";
}

export async function requireAuth(req: Request): Promise<NcbSession> {
  const session = await getSession(getCookie(req));
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}
