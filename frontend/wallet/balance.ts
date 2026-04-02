"use client";

import type { Eip1193Provider } from "./provider";
import { encodeAllowance } from "../utils/erc20";

export async function getNativeBalance(provider: Eip1193Provider, address: string) {
  const hex = await provider.request({ method: "eth_getBalance", params: [address, "latest"] });
  return hex as string;
}

// ERC20 balanceOf(address)
export async function getErc20Balance(provider: Eip1193Provider, token: string, address: string) {
  // balanceOf selector: 0x70a08231
  const selector = "0x70a08231";
  const addr = address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const data = `${selector}${addr}`;
  const res = await provider.request({ method: "eth_call", params: [{ to: token, data }, "latest"] });
  return res as string;
}

export async function getErc20Allowance(provider: Eip1193Provider, token: string, owner: string, spender: string) {
  const data = `0x${encodeAllowance(owner, spender)}`;
  const res = await provider.request({ method: "eth_call", params: [{ to: token, data }, "latest"] });
  return res as string;
}

