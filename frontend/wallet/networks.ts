// Universal chain metadata adapter for the wallet system.
// Source of truth: @lidex/shared

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CHAINS } = require("@lidex/shared");

export type ChainMeta = {
  chainId: number;
  name: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrls: string[];
};

export function getChainMeta(chainId: number): ChainMeta | null {
  const c = (CHAINS.byChainId || {})[chainId];
  if (!c) return null;
  return {
    chainId: c.chainId,
    name: c.name,
    rpcUrls: c.rpcUrls,
    nativeCurrency: c.nativeCurrency,
    blockExplorerUrls: [c.explorers.txBase.replace(/\/tx\/$/, "")]
  };
}

