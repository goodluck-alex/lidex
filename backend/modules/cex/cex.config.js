/**
 * Single-pair CEX matcher (Phase 3). No 0x — internal book only.
 */
const SYMBOL = (process.env.CEX_MATCHER_SYMBOL || "LDX/USDT").trim();
const PARTS = SYMBOL.split("/").map((s) => s.trim().toUpperCase());
if (PARTS.length !== 2 || !PARTS[0] || !PARTS[1]) {
  throw new Error("CEX_MATCHER_SYMBOL must look like LDX/USDT");
}
const [baseAsset, quoteAsset] = PARTS;

function publicConfig() {
  const feeBpsRaw = parseInt(process.env.CEX_FEE_BPS || "0", 10);
  const feeBps = Number.isFinite(feeBpsRaw) && feeBpsRaw > 0 ? Math.min(feeBpsRaw, 5000) : 0;
  const feeTreasury = String(process.env.CEX_FEE_TREASURY_ADDRESS || "").trim().startsWith("0x");

  const minN = String(process.env.CEX_MIN_NOTIONAL_QUOTE || "").trim();
  const minQ = String(process.env.CEX_MIN_QTY_BASE || "").trim();

  const liquidityWrites = String(process.env.CEX_LIQUIDITY_ENABLED || "").toLowerCase() === "true";
  const poolMatching = String(process.env.CEX_POOL_MATCHING_ENABLED || "").toLowerCase() === "true";
  const launchpad = String(process.env.LAUNCHPAD_ENABLED || "").toLowerCase() === "true";
  const liqMining = String(process.env.LIQ_MINING_ENABLED || "true").toLowerCase() !== "false";
  const governanceSignal = String(process.env.GOVERNANCE_SIGNAL_ENABLED || "true").toLowerCase() !== "false";

  return {
    ok: true,
    symbol: SYMBOL,
    baseAsset,
    quoteAsset,
    limits: {
      minNotionalQuote: minN || null,
      minQtyBase: minQ || null,
    },
    features: {
      paperTransfers: String(process.env.CEX_PAPER_TRANSFERS || "").toLowerCase() === "true",
      devFunding: String(process.env.CEX_DEV_FUNDING || "").toLowerCase() === "true",
      feeBps,
      feeTreasuryConfigured: feeTreasury,
      liquidityWritesEnabled: liquidityWrites,
      poolMatchingEnabled: poolMatching,
      stakingAdjustsCexTakerFees:
        String(process.env.CEX_STAKING_FEE_DISCOUNT_ENABLED || "true").toLowerCase() !== "false",
      stakingBoostsDexReferralShare:
        String(process.env.CEX_STAKING_REFERRAL_BOOST_ENABLED || "true").toLowerCase() !== "false",
      launchpadEnabled: launchpad,
      liqMiningEnabled: liqMining,
      governanceSignalEnabled: governanceSignal,
    },
  };
}

module.exports = {
  CEX_MATCHER_SYMBOL: SYMBOL,
  CEX_BASE_ASSET: baseAsset,
  CEX_QUOTE_ASSET: quoteAsset,
  publicConfig,
};
