// Runtime token presets for the frontend.
// Base presets come from `@lidex/shared` and can be overridden via `.env` without a frontend redeploy.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ethers } = require("ethers");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TOKENS, LDX, TOKEN_DISPLAY } = require("@lidex/shared");

function parseChainId(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function envAddress(name) {
  const v = String(process.env[name] || "").trim();
  return v && v.startsWith("0x") ? v : null;
}

function ldxOverrideAddress(chainId) {
  if (chainId === 1) return envAddress("LDX_ADDRESS_ETH");
  if (chainId === 137) return envAddress("LDX_ADDRESS_POLYGON");
  if (chainId === 43114) return envAddress("LDX_ADDRESS_AVALANCHE");
  if (chainId === 42161) return envAddress("LDX_ADDRESS_ARBITRUM");
  return null;
}

function asList(chainTokens) {
  return Object.values(chainTokens || {});
}

function enrichPreset(t) {
  const sym = String(t.symbol || "").toUpperCase();
  const d = TOKEN_DISPLAY[sym];
  return {
    ...t,
    name: d?.name || sym,
    logoUrl: d?.logoUrl != null ? d.logoUrl : null
  };
}

function presetsForChain(chainIdRaw) {
  const chainId = parseChainId(chainIdRaw);
  if (!chainId) {
    const e = new Error("chainId is required");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const base = asList(TOKENS?.phase1?.[chainId]);
  if (!base.length) {
    const e = new Error("unsupported chainId");
    e.code = "UNSUPPORTED_CHAIN";
    throw e;
  }

  const out = base.map(enrichPreset);

  // LDX runtime override: replace/insert token preset by symbol.
  const ldxAddr = ldxOverrideAddress(chainId);
  if (ldxAddr) {
    const sym = "LDX";
    const decimals = Number(LDX?.decimals ?? 18);
    const next = enrichPreset({
      symbol: sym,
      address: ldxAddr,
      decimals: Number.isFinite(decimals) ? decimals : 18
    });
    const idx = out.findIndex((t) => String(t.symbol).toUpperCase() === sym);
    if (idx >= 0) out[idx] = next;
    else out.push(next);
  }

  return { ok: true, chainId, tokens: out };
}

/** Lowercase 0x address for the LDX preset on this chain (env override or shared list), or null. */
function ldxTokenAddressForChain(chainId) {
  const cid = parseChainId(chainId);
  if (!cid) return null;
  const o = ldxOverrideAddress(cid);
  if (o) {
    try {
      return ethers.getAddress(o).toLowerCase();
    } catch {
      return o.toLowerCase();
    }
  }
  const list = asList(TOKENS?.phase1?.[cid]);
  const t = list.find((x) => String(x.symbol).toUpperCase() === "LDX");
  if (!t?.address) return null;
  try {
    return ethers.getAddress(String(t.address)).toLowerCase();
  } catch {
    return String(t.address).toLowerCase();
  }
}

module.exports = { presetsForChain, ldxTokenAddressForChain };

