/**
 * Server-only admin API helper. Never import from client components that ship to the browser
 * with secrets; OK from Server Components, Server Actions, Route Handlers.
 */
export function adminBackendBaseUrl(): string {
  return (
    String(process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").replace(/\/+$/u, "") ||
    "http://localhost:4000"
  );
}

export async function adminApi<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const key = String(process.env.ADMIN_API_KEY || "").trim();
  if (!key) {
    throw new Error("ADMIN_API_KEY is not set on the Next.js server (.env.local)");
  }
  const url = `${adminBackendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const method = String(init?.method || "GET").toUpperCase();
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (method !== "GET" && method !== "HEAD" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }
  Object.assign(headers, init?.headers as Record<string, string>);
  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store"
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = (body as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(err);
  }
  return body as T;
}
