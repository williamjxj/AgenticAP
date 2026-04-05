/**
 * Typed JSON fetch helper targeting the FastAPI `/api/v1` base URL.
 */

const DEFAULT_BASE = "http://127.0.0.1:8000/api/v1";

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return DEFAULT_BASE;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function buildApiUrl(path: string): string {
  const base = getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * GET JSON from a path relative to `NEXT_PUBLIC_API_URL` (must include `/api/v1` in the env value).
 * Safe for **client components** and Route Handlers (uses `fetch`).
 */
export async function apiFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildApiUrl(path);
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail?: unknown }).detail)
        : res.statusText;
    throw new ApiError(msg || `HTTP ${res.status}`, res.status, data);
  }

  return data as T;
}

/**
 * POST `multipart/form-data` and parse JSON. Do not set `Content-Type` (boundary is added by the runtime).
 */
export async function apiPostFormData<T>(path: string, body: FormData): Promise<T> {
  const url = buildApiUrl(path);
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail?: unknown }).detail)
        : res.statusText;
    throw new ApiError(msg || `HTTP ${res.status}`, res.status, data);
  }

  return data as T;
}

/** @deprecated Use `apiFetchJson` (alias). */
export const apiGetJson = apiFetchJson;
