"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LidexMode = "dex" | "cex";

const MODE_COOKIE = "lidex_mode";

type ModeContextValue = {
  mode: LidexMode;
  setMode: (mode: LidexMode) => void;
  toggleMode: () => void;
};

const ModeContext = createContext<ModeContextValue | null>(null);

function readCookieMode(): LidexMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lidex_mode=([^;]+)/);
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return value === "cex" || value === "dex" ? value : null;
}

function writeCookieMode(mode: LidexMode) {
  const maxAgeSeconds = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${MODE_COOKIE}=${encodeURIComponent(mode)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

export function ModeProvider({
  children,
  defaultMode = "dex"
}: {
  children: React.ReactNode;
  defaultMode?: LidexMode;
}) {
  const [mode, setModeState] = useState<LidexMode>(defaultMode);

  useEffect(() => {
    const cookieMode = readCookieMode();
    if (cookieMode) setModeState(cookieMode);
  }, []);

  const api = useMemo<ModeContextValue>(() => {
    const setMode = (next: LidexMode) => {
      setModeState(next);
      writeCookieMode(next);
    };
    const toggleMode = () => setMode(mode === "dex" ? "cex" : "dex");
    return { mode, setMode, toggleMode };
  }, [mode]);

  return <ModeContext.Provider value={api}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}

