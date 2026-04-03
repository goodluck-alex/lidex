export type ChainId = 1 | 56 | 137 | 42161 | 43114;
export type TokenPreset = {
  symbol: string;
  address: string;
  decimals: number;
  name?: string;
  logoUrl?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TOKENS: SHARED_TOKENS, TOKEN_DISPLAY } = require("@lidex/shared") as {
  TOKENS: { phase1: Record<number, Record<string, { symbol: string; address: string; decimals: number }>> };
  TOKEN_DISPLAY: Record<string, { name: string; logoUrl: string | null }>;
};

function asList(chainTokens: Record<string, { symbol: string; address: string; decimals: number }>): TokenPreset[] {
  return Object.values(chainTokens).map((t) => {
    const sym = String(t.symbol).toUpperCase();
    const d = TOKEN_DISPLAY[sym];
    return {
      ...t,
      name: d?.name || t.symbol,
      logoUrl: d?.logoUrl != null ? d.logoUrl : null
    };
  });
}

export const TOKENS: Record<ChainId, TokenPreset[]> = {
  1: asList(SHARED_TOKENS.phase1[1]),
  56: asList(SHARED_TOKENS.phase1[56]),
  137: asList(SHARED_TOKENS.phase1[137]),
  42161: asList(SHARED_TOKENS.phase1[42161]),
  43114: asList(SHARED_TOKENS.phase1[43114])
};

