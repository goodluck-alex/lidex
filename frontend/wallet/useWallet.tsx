"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import type { Eip1193Provider } from "./provider";
import { logout as apiLogout, me as apiMe } from "./auth";

type WalletState = {
  status: "idle" | "connected" | "disconnected" | "unavailable";
  kind: string | null;
  provider: Eip1193Provider | null;
  address: string | null;
  chainId: number | null;
};

type WalletApi = WalletState & {
  /** Opens RainbowKit connect modal (legacy `kind` argument is ignored). */
  connect: (_kind?: string) => void;
  disconnect: () => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
  user: { id?: string; address?: string } | null;
};

const Ctx = createContext<WalletApi | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, status, chainId, connector, isConnecting, isReconnecting } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [user, setUser] = useState<{ id?: string; address?: string } | null>(null);
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    if (!connector) {
      setProvider(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await connector.getProvider();
        if (!cancelled && p) setProvider(p as Eip1193Provider);
      } catch {
        if (!cancelled) setProvider(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connector]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiMe();
        setUser(res.user);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  /** Wallet connected but cookie session is for a different address — invalidate session. */
  useEffect(() => {
    if (isConnecting || isReconnecting) return;
    if (status !== "connected" || !address || !user?.address) return;
    const a = String(address).toLowerCase();
    const u = String(user.address).toLowerCase();
    if (a === u) return;
    let cancelled = false;
    (async () => {
      try {
        await apiLogout();
      } catch {
        /* ignore */
      }
      if (!cancelled) setUser(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, address, user?.address, isConnecting, isReconnecting]);

  /** RainbowKit / wagmi disconnect — clear API session so cookie matches “no wallet”. */
  useEffect(() => {
    if (isConnecting || isReconnecting) return;
    const connected = status === "connected" && !!address;
    const wasConnected = wasConnectedRef.current;
    wasConnectedRef.current = connected;

    if (!wasConnected || connected || !user) return;

    let cancelled = false;
    (async () => {
      try {
        await apiLogout();
      } catch {
        /* ignore */
      }
      if (!cancelled) setUser(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, address, user, isConnecting, isReconnecting]);

  const statusOut: WalletState["status"] = useMemo(() => {
    if (typeof window === "undefined") return "idle";
    if (isConnecting || isReconnecting) return "idle";
    if (status === "connected" && address) return "connected";
    return "disconnected";
  }, [status, address, isConnecting, isReconnecting]);

  const kind = connector?.id ?? null;
  const numericChainId =
    status === "connected" && chainId != null ? Number(chainId) : null;

  const api = useMemo<WalletApi>(() => {
    const connect = () => {
      openConnectModal?.();
    };

    const disconnect = async () => {
      try {
        await apiLogout();
      } catch {
        /* still drop wallet connection */
      }
      setUser(null);
      await disconnectAsync();
    };

    const switchChain = async (target: number) => {
      if (!switchChainAsync) throw new Error("Network switching is not available");
      await switchChainAsync({ chainId: target });
    };

    const refreshMe = async () => {
      const res = await apiMe();
      setUser(res.user);
    };

    const logout = async () => {
      await apiLogout();
      setUser(null);
    };

    return {
      status: statusOut,
      kind,
      provider,
      address: address ?? null,
      chainId: numericChainId,
      connect,
      disconnect,
      switchChain,
      refreshMe,
      logout,
      user,
    };
  }, [
    statusOut,
    kind,
    provider,
    address,
    numericChainId,
    openConnectModal,
    disconnectAsync,
    switchChainAsync,
    user,
  ]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
