const { ethers } = require("ethers");
const { prisma } = require("../../lib/prisma");
const { ldxTokenAddressForChain } = require("../tokens/tokens.presets");

const ERC20_READER_ABI = [
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

/** Fallback public RPCs when `LISTING_RPC_<chainId>` is unset. Override in production. */
const DEFAULT_LISTING_RPC = {
  56: "https://bsc-dataseed.binance.org/",
  1: "https://eth.llamarpc.com",
  137: "https://polygon-rpc.com/",
  43114: "https://api.avax.network/ext/bc/C/rpc",
  42161: "https://arb1.arbitrum.io/rpc",
};

function autoLdxListingEnabled() {
  return String(process.env.LISTING_AUTO_LDX_ENABLED || "").toLowerCase() === "true";
}

function listingRpcUrl(chainId) {
  const fromEnv = String(process.env[`LISTING_RPC_${chainId}`] || "").trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_LISTING_RPC[chainId] || "";
}

function minTotalSupplyRaw() {
  const raw = String(process.env.LISTING_MIN_TOTAL_SUPPLY_RAW || "0").trim();
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

function requireMetadataMatch() {
  return String(process.env.LISTING_AUTO_REQUIRE_METADATA_MATCH || "true").toLowerCase() !== "false";
}

/**
 * @param {import('ethers').JsonRpcProvider} provider
 * @param {string} tokenAddress checksummed or lowercase 0x address
 */
async function readErc20Meta(provider, tokenAddress) {
  const addr = ethers.getAddress(tokenAddress);
  const c = new ethers.Contract(addr, ERC20_READER_ABI, provider);
  const [totalSupply, decimals, symbol] = await Promise.all([c.totalSupply(), c.decimals(), c.symbol()]);
  let sym;
  try {
    sym = String(symbol || "").trim().toUpperCase();
  } catch {
    return { ok: false, error: "symbol_decode_failed" };
  }
  const dec = Number(decimals);
  if (!Number.isFinite(dec) || dec < 0 || dec > 36) return { ok: false, error: "invalid_decimals_on_chain" };
  if (!sym) return { ok: false, error: "empty_symbol_on_chain" };
  return {
    ok: true,
    totalSupply: BigInt(totalSupply.toString()),
    decimals: dec,
    symbol: sym,
  };
}

/**
 * When enabled, `pairWithLdx` applications can upsert `listed_tokens` if ERC-20 checks pass.
 * @param {import('@prisma/client').TokenListingApplication} applicationRow
 */
async function maybeAutoListAfterApplication(applicationRow) {
  const { id, chainId, tokenAddress, symbol: userSymbol, decimals: userDecimals, pairWithLdx } = applicationRow;

  if (!autoLdxListingEnabled() || !pairWithLdx) {
    return { attempted: false, outcome: "manual" };
  }

  const rpc = listingRpcUrl(chainId);
  if (!rpc) {
    await prisma.tokenListingApplication.update({
      where: { id },
      data: {
        automationNote:
          `Automated TOKEN/LDX listing skipped: set LISTING_RPC_${chainId} (no default or env RPC for this chain).`,
      },
    });
    return { attempted: true, outcome: "skipped_no_rpc" };
  }

  const ldx = ldxTokenAddressForChain(chainId);
  if (ldx && tokenAddress === ldx) {
    await prisma.tokenListingApplication.update({
      where: { id },
      data: { status: "auto_rejected", automationNote: "Token address matches the platform LDX contract." },
    });
    return { attempted: true, outcome: "rejected_ldx_self" };
  }

  const minS = minTotalSupplyRaw();
  const metaMatch = requireMetadataMatch();
  const provider = new ethers.JsonRpcProvider(rpc);

  /** @type {{ ok: true, totalSupply: bigint, decimals: number, symbol: string } | { ok: false, error: string }} */
  let meta;
  try {
    meta = await readErc20Meta(provider, tokenAddress);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.tokenListingApplication.update({
      where: { id },
      data: { status: "auto_rejected", automationNote: `On-chain read failed: ${msg}` },
    });
    return { attempted: true, outcome: "rejected_read" };
  }

  if (!meta.ok) {
    await prisma.tokenListingApplication.update({
      where: { id },
      data: { status: "auto_rejected", automationNote: `Invalid or non-standard ERC-20: ${meta.error}.` },
    });
    return { attempted: true, outcome: "rejected_meta" };
  }

  if (meta.totalSupply < minS) {
    await prisma.tokenListingApplication.update({
      where: { id },
      data: {
        status: "auto_rejected",
        automationNote: `Total supply ${meta.totalSupply.toString()} is below LISTING_MIN_TOTAL_SUPPLY_RAW (${minS.toString()}).`,
      },
    });
    return { attempted: true, outcome: "rejected_supply" };
  }

  if (metaMatch) {
    if (meta.symbol !== String(userSymbol).toUpperCase()) {
      await prisma.tokenListingApplication.update({
        where: { id },
        data: {
          status: "auto_rejected",
          automationNote: `Symbol mismatch: form "${userSymbol}" vs chain "${meta.symbol}".`,
        },
      });
      return { attempted: true, outcome: "rejected_symbol" };
    }
    if (meta.decimals !== userDecimals) {
      await prisma.tokenListingApplication.update({
        where: { id },
        data: {
          status: "auto_rejected",
          automationNote: `Decimals mismatch: form ${userDecimals} vs chain ${meta.decimals}.`,
        },
      });
      return { attempted: true, outcome: "rejected_decimals" };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.listedToken.upsert({
      where: { chainId_address: { chainId, address: tokenAddress } },
      create: {
        chainId,
        address: tokenAddress,
        symbol: meta.symbol,
        decimals: meta.decimals,
        name: String(applicationRow.projectName || "").trim() || meta.symbol,
        status: "active",
        featured: false,
      },
      update: {
        symbol: meta.symbol,
        decimals: meta.decimals,
        name: String(applicationRow.projectName || "").trim() || meta.symbol,
        status: "active",
      },
    });
    await tx.tokenListingApplication.update({
      where: { id },
      data: { status: "auto_listed", automationNote: null },
    });
  });

  return { attempted: true, outcome: "listed" };
}

module.exports = { autoLdxListingEnabled, maybeAutoListAfterApplication, listingRpcUrl, minTotalSupplyRaw };
