const SESSION_SALT = "lidex-internal-admin-ui-v1";

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) v |= a[i]! ^ b[i]!;
  return v === 0;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function signInternalAdminSession(uiPassword: string): Promise<string> {
  const secret = String(process.env.ADMIN_API_KEY || "").trim();
  if (!secret) throw new Error("ADMIN_API_KEY is not configured");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign"
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${SESSION_SALT}:${uiPassword}`));
  return base64UrlEncode(new Uint8Array(sig));
}

export async function verifyInternalAdminCookie(cookieVal: string | undefined): Promise<boolean> {
  const secret = String(process.env.ADMIN_API_KEY || "").trim();
  if (!secret) return false;

  const uiPwd = String(process.env.INTERNAL_ADMIN_UI_PASSWORD || "").trim();
  if (!uiPwd) {
    return process.env.NODE_ENV !== "production";
  }

  if (!cookieVal) return false;

  try {
    const expected = await signInternalAdminSession(uiPwd);
    const a = base64UrlDecode(cookieVal);
    const b = base64UrlDecode(expected);
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const INTERNAL_ADMIN_COOKIE = "lidex_ia";
