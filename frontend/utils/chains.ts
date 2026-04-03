// Frontend wrapper around shared chain registry.
// We keep this small adapter so the UI stays stable while the registry evolves.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CHAINS } = require("@lidex/shared");

export const CHAIN_META: Record<number, { name: string; explorerTxBase: string }> = Object.fromEntries(
  Object.values(CHAINS.byChainId).map((c: any) => [c.chainId, { name: c.name, explorerTxBase: c.explorers.txBase }])
);

export function chainName(chainId: number | null) {
  if (!chainId) return "—";
  return CHAIN_META[chainId]?.name || String(chainId);
}

export function txUrl(chainId: number | null, hash: string) {
  if (!chainId) return null;
  const base = CHAIN_META[chainId]?.explorerTxBase;
  return base ? `${base}${hash}` : null;
}

/** Contract label page (e.g. BscScan `/address/0x…`), derived from `explorers.txBase`. */
export function contractUrl(chainId: number | null, address: string) {
  if (!chainId) return null;
  const base = CHAIN_META[chainId]?.explorerTxBase;
  if (!base) return null;
  const prefix = base.replace(/\/tx\/?$/i, "/address/");
  return `${prefix}${address}`;
}

