const { LDX, TOKENS } = require("@lidex/shared");
const { resolveSchedule, inPresaleWindow } = require("./presale.schedule");

/**
 * Sort token addresses for consistent Pancake "add liquidity" links (lower hex first).
 */
function sortAddresses(addrA, addrB) {
  const a = String(addrA).toLowerCase();
  const b = String(addrB).toLowerCase();
  return a <= b ? [addrA, addrB] : [addrB, addrA];
}

/**
 * BSC add-liquidity shortcut (Pancake v2 style). Override with PANCAKE_ADD_LIQUIDITY_PREFIX if UI changes.
 */
function addLiquidityUrl(chainId, tokenA, tokenB) {
  if (chainId !== 56) return null;
  const prefix =
    process.env.PANCAKE_ADD_LIQUIDITY_PREFIX || "https://pancakeswap.finance/v2/add";
  const [t0, t1] = sortAddresses(tokenA, tokenB);
  return `${prefix}/${t0}/${t1}?chain=bsc`;
}

const FN_SAFE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function resolvePaymentToken(chainId, tokens) {
  const mode = String(process.env.PRESALE_PAYMENT_MODE || "erc20").toLowerCase();
  if (mode === "native") return { paymentMode: "native", paymentToken: null };
  let addr = process.env.PRESALE_PAYMENT_TOKEN || tokens.USDT?.address || null;
  if (!addr) return { paymentMode: "erc20", paymentToken: null };
  addr = String(addr).trim();
  let symbol = (process.env.PRESALE_PAYMENT_SYMBOL || "").trim();
  let decimals = parseInt(process.env.PRESALE_PAYMENT_DECIMALS || "", 10);
  const fromPreset = Object.values(tokens).find((t) => t && String(t.address).toLowerCase() === addr.toLowerCase());
  if (fromPreset) {
    if (!symbol) symbol = fromPreset.symbol;
    if (!Number.isFinite(decimals)) decimals = fromPreset.decimals;
  }
  if (!symbol) symbol = "PAY";
  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 36) decimals = 18;
  return {
    paymentMode: "erc20",
    paymentToken: { address: addr, symbol, decimals },
  };
}

function defaultPurchaseFn(paymentMode) {
  const custom = (process.env.PRESALE_PURCHASE_FN || "").trim();
  if (custom && FN_SAFE.test(custom)) return custom;
  return paymentMode === "native" ? "buy" : "buyTokens";
}

/**
 * Phase 2 — LDX launch surface: token metadata, presale flags (env), pool links, trading pairs,
 * plus on-chain presale **config** for the web UI (txs are signed in the browser only).
 */
async function overview() {
  const chainId = parseInt(process.env.PRESALE_CHAIN_ID || process.env.LDX_LAUNCH_CHAIN_ID || "56", 10);
  const ldxAddress = LDX.addresses[chainId];
  const tokens = TOKENS.phase1[chainId] || {};

  const usdt = tokens.USDT?.address;
  const eth = tokens.ETH?.address;
  const bnb = tokens.BNB?.address;

  /** @type {{ symbol: string, quote: string, liquidityUrl: string | null }[]} */
  const tradePairs = [];
  if (ldxAddress && usdt) {
    tradePairs.push({
      symbol: "LDX/USDT",
      quote: "USDT",
      liquidityUrl: addLiquidityUrl(chainId, ldxAddress, usdt),
    });
  }
  if (ldxAddress && eth) {
    tradePairs.push({
      symbol: "LDX/ETH",
      quote: "ETH",
      liquidityUrl: addLiquidityUrl(chainId, ldxAddress, eth),
    });
  }
  if (ldxAddress && bnb) {
    tradePairs.push({
      symbol: "LDX/BNB",
      quote: "BNB",
      liquidityUrl: addLiquidityUrl(chainId, ldxAddress, bnb),
    });
  }

  const presaleContract = process.env.PRESALE_CONTRACT_BSC || process.env.PRESALE_CONTRACT || null;
  const presaleActive =
    String(process.env.PRESALE_ACTIVE || "").toLowerCase() === "true" ||
    String(process.env.PRESALE_ENABLED || "").toLowerCase() === "true";
  const presaleExternalUrl = process.env.PRESALE_URL || null;

  const { paymentMode, paymentToken } = resolvePaymentToken(chainId, tokens);
  const purchaseFunction = defaultPurchaseFn(paymentMode);
  const nativeSymbol =
    (process.env.PRESALE_NATIVE_SYMBOL || "").trim() ||
    (chainId === 56 ? "BNB" : chainId === 1 ? "ETH" : "NATIVE");

  let instructions =
    presaleContract || presaleExternalUrl
      ? "Participate with your wallet below (transactions are signed in your browser; this API never holds funds)."
      : "Set PRESALE_ACTIVE=true and PRESALE_CONTRACT_BSC or PRESALE_URL in backend .env when your presale is live.";
  if (presaleContract && paymentMode === "erc20" && !paymentToken) {
    instructions += " Set PRESALE_PAYMENT_TOKEN (or deploy on a chain where USDT is in presets).";
  }

  const schedule = await resolveSchedule(chainId, presaleContract);
  const windowOpen = inPresaleWindow(schedule.startAt, schedule.endAt);
  const ready = paymentMode === "native" || !!paymentToken;
  const onchain = presaleContract
    ? {
        chainId,
        contractAddress: presaleContract,
        ready,
        buyEnabled: presaleActive && ready && windowOpen,
        paymentMode,
        /** Human label for native purchases (e.g. BNB on BSC). */
        nativeSymbol,
        paymentToken,
        purchaseFunction,
      }
    : null;

  return {
    ok: true,
    chainId,
    token: ldxAddress
      ? {
          symbol: LDX.symbol,
          name: LDX.name,
          decimals: LDX.decimals,
          address: ldxAddress,
          totalSupply: LDX.totalSupply,
          explorerUrl: LDX.explorerUrls?.[chainId] || null,
        }
      : null,
    presale: {
      active: presaleActive,
      contractAddress: presaleContract,
      externalUrl: presaleExternalUrl,
      instructions,
    },
    schedule: {
      ...schedule,
      windowOpen,
    },
    onchain,
    liquidity: {
      summary: "Create AMM pools (e.g. PancakeSwap) for each pair so 0x can aggregate DEX swaps.",
      pairs: tradePairs,
    },
    trading: {
      summary: "Enable markets via DEX_ACTIVE_PAIR_SYMBOLS after quotes work; trade on Swap (BSC).",
      pairSymbols: ["LDX/USDT", "LDX/ETH", "LDX/BNB"],
    },
  };
}

module.exports = { overview };
