/**
 * Maps Lidex pair **base** symbols (uppercase) to CoinGecko coin ids for `/coins/markets`.
 * Extend when new listed bases go live.
 */
const MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  MATIC: "matic-network",
  POL: "matic-network",
  AVAX: "avalanche-2",
  ARB: "arbitrum",
  OP: "optimism",
  ATOM: "cosmos",
  LINK: "chainlink",
  LTC: "litecoin",
  UNI: "uniswap",
  NEAR: "near",
  APT: "aptos",
  SUI: "sui",
  SEI: "sei-network",
  TIA: "celestia",
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
  TRX: "tron",
  SHIB: "shiba-inu",
  PEPE: "pepe",
  WIF: "dogwifcoin",
  BONK: "bonk",
  FTM: "fantom",
  CRO: "crypto-com-chain",
  OKB: "okb",
  LEO: "leo-token",
  MNT: "mantle",
  STX: "blockstack",
  INJ: "injective-protocol",
  RNDR: "render-token",
  IMX: "immutable-x",
  FIL: "filecoin",
  HBAR: "hedera-hashgraph",
  VET: "vechain",
  QNT: "quant-network",
  AAVE: "aave",
  MKR: "maker",
  GRT: "the-graph",
  SNX: "havven",
  RUNE: "thorchain",
  FET: "fetch-ai",
  LDO: "lido-dao",
  JUP: "jupiter-exchange-solana",
  PYTH: "pyth-network",
  WLD: "worldcoin-wld",
  STRK: "starknet",
  BLUR: "blur",
  TON: "the-open-network"
};

export function baseSymbolToCoingeckoId(base: string): string | null {
  const k = String(base || "").trim().toUpperCase();
  return MAP[k] ?? null;
}

export function uniqueCoingeckoIdsForBases(bases: string[]): string[] {
  const ids = new Set<string>();
  for (const b of bases) {
    const id = baseSymbolToCoingeckoId(b);
    if (id) ids.add(id);
  }
  return [...ids];
}
