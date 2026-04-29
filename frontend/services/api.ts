export type ApiResult<T> = { ok: true } & T;

/** Must match backend `lidexMode` middleware and `context/mode.tsx` cookie name. */
export const LIDEX_MODE_HEADER = "X-Lidex-Mode";

const MODE_COOKIE = "lidex_mode";

function readBrowserLidexMode(): "dex" | "cex" {
  if (typeof document === "undefined") return "dex";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${MODE_COOKIE}=([^;]+)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return value === "cex" ? "cex" : "dex";
}

/** Same as cookie/header mode used by `lidexModeHeaders` (for EventSource URLs, etc.). */
export function browserLidexMode(): "dex" | "cex" {
  return readBrowserLidexMode();
}

/** Send on every `/v1/*` call (except auth bootstrap) so the API can enforce DEX vs CEX surfaces. */
export function lidexModeHeaders(): Record<string, string> {
  return { [LIDEX_MODE_HEADER]: readBrowserLidexMode() };
}

/** Trim + strip trailing slashes so `${origin}/v1/...` never becomes `//v1/...` (some CDNs return 404). */
export function backendBaseUrl() {
  const raw = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").trim();
  return raw.replace(/\/+$/, "") || "http://localhost:4000";
}

function baseUrl() {
  return backendBaseUrl();
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { ...lidexModeHeaders() }
  });
  const data = (await res.json().catch(() => null)) as
    | T
    | { ok?: false; error?: string; message?: string; code?: string }
    | null;
  if (!res.ok) {
    const base = baseUrl();
    const hint404 =
      res.status === 404
        ? ` (check NEXT_PUBLIC_BACKEND_URL — currently "${base}"; use Render API origin with no trailing slash, e.g. https://your-service.onrender.com)`
        : "";
    const msg =
      (data as any)?.message ||
      (data as any)?.error ||
      `GET ${path} failed: ${res.status}${hint404}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...lidexModeHeaders() },
    body: JSON.stringify(body)
  });
  const data = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) {
    const msg = (data as any)?.message || (data as any)?.error || `POST ${path} failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...lidexModeHeaders() },
    body: JSON.stringify(body)
  });
  const data = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) {
    const msg = (data as any)?.message || (data as any)?.error || `PATCH ${path} failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...lidexModeHeaders() }
  });
  const data = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) {
    const msg = (data as any)?.message || (data as any)?.error || `DELETE ${path} failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

