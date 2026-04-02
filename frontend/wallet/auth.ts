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
  const refCode = getRefCode();
  if (refCode) {
    try {
      await apiPost<any>("/v1/referral/attach", { refCode });
      clearRefCode();
    } catch {
      // keep cookie; user can retry later
    }
  }
  return res;
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

