export type ChainId = 1 | 56 | 137 | 42161 | 43114;
export type TokenPreset = { symbol: string; address: string; decimals: number };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TOKENS: SHARED_TOKENS } = require("@lidex/shared");

function asList(chainTokens: Record<string, TokenPreset>) {
  return Object.values(chainTokens);
}

export const TOKENS: Record<ChainId, TokenPreset[]> = {
  1: asList(SHARED_TOKENS.phase1[1]),
  56: asList(SHARED_TOKENS.phase1[56]),
  137: asList(SHARED_TOKENS.phase1[137]),
  42161: asList(SHARED_TOKENS.phase1[42161]),
  43114: asList(SHARED_TOKENS.phase1[43114])
};

