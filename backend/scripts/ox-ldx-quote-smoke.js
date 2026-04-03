/**
 * Phase 2: verify 0x can quote LDX legs on BSC after AMM liquidity exists.
 * Usage: from backend/, `npm run ldx:quote-smoke` (needs OX_API_KEY + network).
 *
 * Fails with liquidity/route errors until Pancake (or similar) pools are live — expected.
 */
require("dotenv").config();

const swap0x = require("../modules/swap0x/swap0x.service");
const { LDX } = require("@lidex/shared");

const CHAIN_ID = 56;
const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";

/** 0.001 token @ 18 decimals */
const TINY = "1000000000000000";

async function main() {
  const key = process.env.OX_API_KEY || process.env.ZEROX_API_KEY;
  if (!key) {
    console.error("Missing OX_API_KEY (or ZEROX_API_KEY) in .env");
    process.exit(1);
  }

  const ldx = LDX.addresses[CHAIN_ID];
  if (!ldx) {
    console.error("No LDX address for chain", CHAIN_ID);
    process.exit(1);
  }

  const legs = [
    { label: "LDX -> USDT", sellToken: ldx, buyToken: USDT_BSC, sellAmount: TINY },
    { label: "USDT -> LDX", sellToken: USDT_BSC, buyToken: ldx, sellAmount: "1000000000000000000" }, // 1 USDT-ish (18 dec on BSC USDT)
  ];

  for (const leg of legs) {
    process.stdout.write(`${leg.label} … `);
    try {
      const q = await swap0x.quote({
        chainId: CHAIN_ID,
        sellToken: leg.sellToken,
        buyToken: leg.buyToken,
        sellAmount: leg.sellAmount,
        slippagePercentage: 0.01,
      });
      const liq = q?.liquidityAvailable;
      if (liq === false) {
        console.log("NO_ROUTE (add Pancake LP — 0x liquidityAvailable=false)");
      } else {
        const buy = q?.buyAmount ?? q?.minBuyAmount;
        console.log("OK", buy != null ? `buyAmount=${String(buy).slice(0, 24)}…` : "");
      }
    } catch (e) {
      console.log("FAIL");
      console.error(`  ${e.message}`);
      if (e.details && typeof e.details === "object") {
        console.error("  ", JSON.stringify(e.details).slice(0, 500));
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
