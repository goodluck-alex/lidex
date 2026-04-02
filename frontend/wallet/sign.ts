"use client";

import type { Eip1193Provider } from "./provider";

export async function signMessage(provider: Eip1193Provider, address: string, message: string) {
  // personal_sign expects params: [message, address]
  const sig = await provider.request({ method: "personal_sign", params: [message, address] });
  return sig as string;
}

