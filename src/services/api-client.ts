import type { ApiError } from "@/types";

export class ApiClientError extends Error {
  status: number;
  data: ApiError;

  constructor(status: number, data: ApiError) {
    super(data.error || "Невідома помилка");
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let data: ApiError;
    try {
      data = await res.json();
    } catch {
      data = { error: `HTTP ${res.status}: ${res.statusText}` };
    }
    throw new ApiClientError(res.status, data);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiGet<T>(url: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        searchParams.set(key, String(val));
      }
    }
  }
  const qs = searchParams.toString();
  const fullUrl = qs ? `${url}?${qs}` : url;

  const res = await fetch(fullUrl, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<T>(res);
}
