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

/** Send on every `/v1/*` call (except auth bootstrap) so the API can enforce DEX vs CEX surfaces. */
export function lidexModeHeaders(): Record<string, string> {
  return { [LIDEX_MODE_HEADER]: readBrowserLidexMode() };
}

function baseUrl() {
  // Next exposes NEXT_PUBLIC_* to the browser
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { ...lidexModeHeaders() }
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
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
    const msg = (data as any)?.error || `POST ${path} failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

