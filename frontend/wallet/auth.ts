"use client";

import { apiGet, apiPost } from "../services/api";
import type { Eip1193Provider } from "./provider";
import { getRefCode, clearRefCode } from "./referral";

export type NonceResponse = { ok: true; nonce: string; message: string };
export type VerifyResponse = { ok: true; user: { id: string; address: string } };
export type MeResponse = { ok: true; user: any | null };

export async function getNonce(address: string, chainId: number) {
  return apiPost<NonceResponse>("/v1/auth/nonce", { address, chainId });
}

export async function verify(address: string, chainId: number, nonce: string, signature: string) {
  const res = await apiPost<VerifyResponse>("/v1/auth/verify", { address, chainId, nonce, signature });
  await tryAttachStoredReferral();
  return res;
}

export async function tryAttachStoredReferral() {
  const refCode = getRefCode();
  if (!refCode) return { ok: true as const, attached: false, reason: "no_ref_code" as const };
  try {
    await apiPost<any>("/v1/referral/attach", { refCode });
    clearRefCode();
    return { ok: true as const, attached: true };
  } catch (e) {
    // Keep the cookie on transient failures so a later authenticated session can retry.
    return {
      ok: false as const,
      attached: false,
      error: e instanceof Error ? e.message : "Referral attach failed",
    };
  }
}

export async function logout() {
  return apiPost<{ ok: true }>("/v1/auth/logout", {});
}

export async function me() {
  return apiGet<MeResponse>("/v1/me");
}

export async function signLoginMessage(provider: Eip1193Provider, address: string, message: string) {
  const sig = await provider.request({ method: "personal_sign", params: [message, address] });
  return String(sig);
}

