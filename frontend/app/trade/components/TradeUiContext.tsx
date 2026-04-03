"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type TradeUi = {
  limitPrice: string;
  setLimitPrice: (v: string) => void;
};

const Ctx = createContext<TradeUi | null>(null);

export function TradeUiProvider({ children }: { children: React.ReactNode }) {
  const [limitPrice, setLimitPrice] = useState("0.05");
  const value = useMemo(() => ({ limitPrice, setLimitPrice }), [limitPrice]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTradeUi() {
  const x = useContext(Ctx);
  if (!x) throw new Error("useTradeUi must be used under TradeUiProvider");
  return x;
}

export function useTradeUiOptional(): TradeUi | null {
  return useContext(Ctx);
}
