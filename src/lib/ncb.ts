/**
 * NCB (NoCodeBackend) — DRY HTTP utility
 * 
 * Data CRUD API: https://openapi.nocodebackend.com  (create/read/update/delete/search)
 * Auth API:      https://app.nocodebackend.com/api/user-auth  (sign-up/sign-in/get-session)
 * Instance:      55446_crm_transcriber_system
 * 
 * Both URLs are used. Auth for login/session. Data for all CRUD.
 */

// Read env at runtime using bracket notation so Next.js cannot inline at build time
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

function baseHeaders(): Record<string, string> {
  const e = env();
  return {
    "Content-Type": "application/json",
    "X-Database-Instance": e.instance,
    Authorization: `Bearer ${e.secret}`,
  };
}

function userHeaders(cookie: string): Record<string, string> {
  return {
    ...baseHeaders(),
    Cookie: cookie,
  };
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

/**
 * Validate user session from cookie.
 * Returns session or null if invalid.
 */
export async function getSession(cookie: string): Promise<NcbSession | null> {
  try {
    const res = await fetch(`${env().authUrl}/get-session`, {
      headers: userHeaders(cookie),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? data : null;
  } catch {
    return null;
  }
}

// ============ CRUD (server-side, no user cookie) ============

/**
 * Create a record. Returns { id } of new record.
 */
export async function create<T extends Record<string, unknown>>(
  table: string,
  data: T
): Promise<{ id: number }> {
  const res = await fetch(`${env().dataUrl}/create/${table}`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NCB create ${table} failed (${res.status}): ${err}`);
  }
  const result = await res.json();
  return { id: result.id || result.data?.id };
}

/**
 * Read a single record by ID.
 */
export async function readOne<T = any>(
  table: string,
  id: number | string
): Promise<T | null> {
  const res = await fetch(`${env().dataUrl}/read/${table}/${id}`, {
    headers: baseHeaders(),
  });
  if (!res.ok) return null;
  const result = await res.json();
  return result.data || result;
}

/**
 * Read records with filters.
 * Filters: { workspace_id: 5, status: "active", "duration_seconds[gt]": 60 }
 */
export async function read<T = any>(
  table: string,
  options?: NcbListOptions
): Promise<NcbListResult<T>> {
  const params = new URLSearchParams();
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

  const qs = params.toString();
  const url = `${env().dataUrl}/read/${table}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { headers: baseHeaders() });
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

/**
 * Search records (POST body match).
 */
export async function search<T = any>(
  table: string,
  body: Record<string, unknown>
): Promise<T[]> {
  const res = await fetch(`${env().dataUrl}/search/${table}`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`NCB search ${table} failed (${res.status}): ${await res.text()}`);
  }
  const result = await res.json();
  return result.data || [];
}

/**
 * Update a record by ID. Partial update.
 */
export async function update(
  table: string,
  id: number | string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${env().dataUrl}/update/${table}/${id}`, {
    method: "PUT",
    headers: baseHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(`[NCB] Update ${table}/${id} failed:`, await res.text());
  }
}

/**
 * Delete a record by ID.
 */
export async function remove(table: string, id: number | string): Promise<void> {
  const res = await fetch(`${env().dataUrl}/delete/${table}/${id}`, {
    method: "DELETE",
    headers: baseHeaders(),
  });
  if (!res.ok) {
    console.error(`[NCB] Delete ${table}/${id} failed:`, await res.text());
  }
}

// ============ User-scoped CRUD (with cookie for RLS) ============

/**
 * Read records as authenticated user (RLS applied).
 */
export async function readAsUser<T = any>(
  table: string,
  cookie: string,
  options?: NcbListOptions
): Promise<NcbListResult<T>> {
  const params = new URLSearchParams();
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

  const qs = params.toString();
  const url = `${env().dataUrl}/read/${table}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { headers: userHeaders(cookie) });
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

/**
 * Create record as authenticated user (RLS applied).
 */
export async function createAsUser(
  table: string,
  cookie: string,
  data: Record<string, unknown>
): Promise<{ id: number }> {
  const res = await fetch(`${env().dataUrl}/create/${table}`, {
    method: "POST",
    headers: userHeaders(cookie),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`NCB create ${table} failed (${res.status}): ${await res.text()}`);
  }
  const result = await res.json();
  return { id: result.id || result.data?.id };
}

// ============ Helpers ============

/**
 * Find one record by filters. Returns first match or null.
 */
export async function findOne<T = any>(
  table: string,
  filters: Record<string, string | number>
): Promise<T | null> {
  const result = await read<T>(table, { filters, limit: 1 });
  return result.data[0] || null;
}

/**
 * Get cookie from NextRequest.
 */
export function getCookie(req: Request): string {
  return req.headers.get("cookie") || "";
}

/**
 * Auth guard — returns session or throws 401 Response.
 */
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
