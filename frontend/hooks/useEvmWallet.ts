"use client";

import { useEffect, useMemo, useState } from "react";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum || null;
}

function toNumberChainId(chainIdHex: string | number): number | null {
  if (typeof chainIdHex === "number") return chainIdHex;
  if (typeof chainIdHex !== "string") return null;
  if (chainIdHex.startsWith("0x")) return parseInt(chainIdHex, 16);
  const n = Number(chainIdHex);
  return Number.isFinite(n) ? n : null;
}

export function useEvmWallet() {
  const provider = useMemo(() => getProvider(), []);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState<"unavailable" | "disconnected" | "connected">(
    provider ? "disconnected" : "unavailable"
  );

  useEffect(() => {
    if (!provider) return;

    let mounted = true;

    const sync = async () => {
      try {
        const [accounts, cid] = await Promise.all([
          provider.request({ method: "eth_accounts" }),
          provider.request({ method: "eth_chainId" })
        ]);
        if (!mounted) return;
        const nextAddr = Array.isArray(accounts) && accounts[0] ? String(accounts[0]) : null;
        setAddress(nextAddr);
        setChainId(toNumberChainId(cid));
        setStatus(nextAddr ? "connected" : "disconnected");
      } catch {
        if (!mounted) return;
        setStatus("disconnected");
      }
    };

    const onAccountsChanged = (accounts: string[]) => {
      const nextAddr = accounts?.[0] ? String(accounts[0]) : null;
      setAddress(nextAddr);
      setStatus(nextAddr ? "connected" : "disconnected");
    };

    const onChainChanged = (cid: string) => {
      setChainId(toNumberChainId(cid));
    };

    sync();
    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", onChainChanged);

    return () => {
      mounted = false;
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, [provider]);

  const connect = async () => {
    if (!provider) return;
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const nextAddr = Array.isArray(accounts) && accounts[0] ? String(accounts[0]) : null;
    setAddress(nextAddr);
    setStatus(nextAddr ? "connected" : "disconnected");
    const cid = await provider.request({ method: "eth_chainId" });
    setChainId(toNumberChainId(cid));
  };

  const switchChain = async (targetChainId: number) => {
    if (!provider) return;
    const chainIdHex = `0x${targetChainId.toString(16)}`;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
    } catch (e: any) {
      // 4902 = chain not added
      if (e?.code !== 4902) throw e;
      if (targetChainId === 56) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x38",
              chainName: "BNB Smart Chain",
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              rpcUrls: ["https://bsc-dataseed.binance.org/"],
              blockExplorerUrls: ["https://bscscan.com"]
            }
          ]
        });
      } else {
        throw e;
      }
    }
  };

  return { providerAvailable: !!provider, status, address, chainId, connect, switchChain };
}

