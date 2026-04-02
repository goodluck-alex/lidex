"use client";

const REF_COOKIE = "lidex_ref";

export function getRefCode(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lidex_ref=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function setRefCode(refCode: string) {
  const maxAgeSeconds = 60 * 60 * 24 * 30; // 30 days
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(refCode)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearRefCode() {
  document.cookie = `${REF_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

