"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Grid, PageShell, Span } from "../../components/ui";
import { TOKENS, type ChainId } from "../../utils/tokens";
import { encodeAllowance, encodeApprove, hexToBigInt, maxUint256Hex } from "../../utils/erc20";
import { chainName, txUrl } from "../../utils/chains";
import { useWallet } from "../../wallet/useWallet";
import { apiGet, apiPost } from "../../services/api";
import { loadTradingPreferences, saveTradingPreferences } from "../../lib/tradingPreferences";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LDX } = require("@lidex/shared") as { LDX: { explorerUrls?: Record<number, string> } };
const LDX_BSC_EXPLORER = LDX?.explorerUrls?.[56] ?? null;

type QuoteResponse = { ok: true; quote: unknown };
type ExecuteResponse = { ok: true; tx: { to: string; data: string; value?: string }; referralReward?: { id: string } };

export default function SwapPage() {
  const wallet = useWallet();
  const [chainId, setChainId] = useState<ChainId>(56);
  const [runtimePresets, setRuntimePresets] = useState<{
    chainId: ChainId;
    tokens: { symbol: string; address: string; decimals: number; name?: string; logoUrl?: string | null }[];
  } | null>(null);
  const presets = useMemo(() => runtimePresets?.chainId === chainId ? runtimePresets.tokens : (TOKENS[chainId] || []), [runtimePresets, chainId]);
  const [sellToken, setSellToken] = useState<string>(TOKENS[56][0].address);
  const [buyToken, setBuyToken] = useState<string>(TOKENS[56][1].address);
  const [sellAmountBase, setSellAmountBase] = useState<string>("0.01");
  const [slippage, setSlippage] = useState<string>("0.005");

  const [quote, setQuote] = useState<any | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<"idle" | "approving" | "swapping">("idle");
  const [allowanceOk, setAllowanceOk] = useState<boolean | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [slippagePanelOpen, setSlippagePanelOpen] = useState(false);
  const [arrowSpin, setArrowSpin] = useState(false);

  const sellPreset = presets.find((t) => t.address.toLowerCase() === sellToken.toLowerCase());
  const buyPreset = presets.find((t) => t.address.toLowerCase() === buyToken.toLowerCase());

  useEffect(() => {
    let cancelled = false;
    apiGet<{
      ok: true;
      chainId: number;
      tokens: { symbol: string; address: string; decimals: number; name?: string; logoUrl?: string | null }[];
    }>(`/v1/tokens/presets?chainId=${chainId}`)
      .then((r) => {
        if (cancelled) return;
        setRuntimePresets({ chainId: r.chainId as ChainId, tokens: r.tokens || [] });
      })
      .catch(() => {
        if (!cancelled) setRuntimePresets(null);
      });
    return () => {
      cancelled = true;
    };
  }, [chainId]);

  useEffect(() => {
    // If wallet is connected, auto-follow its chainId.
    if (wallet.status !== "connected" || !wallet.chainId) return;
    const cid = wallet.chainId as ChainId;
    if (!TOKENS[cid]) return;
    setChainId(cid);
    const p = TOKENS[cid] || [];
    if (p[0]) setSellToken(p[0].address);
    if (p[1]) setBuyToken(p[1].address);
    setQuote(null);
    setQuoteError(null);
    setAllowanceOk(null);
    setTxHash(null);
    setSending("idle");
  }, [wallet.status, wallet.chainId]);

  useEffect(() => {
    setSlippage(loadTradingPreferences().slippageDecimal);
  }, []);

  useEffect(() => {
    const onPrefs = (ev: Event) => {
      const ce = ev as CustomEvent<{ slippageDecimal?: string }>;
      if (ce.detail?.slippageDecimal) setSlippage(ce.detail.slippageDecimal);
    };
    window.addEventListener("lidex-trading-prefs-changed", onPrefs);
    return () => window.removeEventListener("lidex-trading-prefs-changed", onPrefs);
  }, []);

  const connectedChainSupported = wallet.status !== "connected" || !wallet.chainId ? true : !!TOKENS[wallet.chainId as ChainId];
  const chainMismatch =
    wallet.status === "connected" && wallet.chainId != null && Number(wallet.chainId) !== Number(chainId);

  const showLdxQuickPairs = chainId === 56 && presets.some((t) => t.symbol.toUpperCase() === "LDX");

  function addressForSymbol(sym: string): string | null {
    const u = sym.toUpperCase();
    const t = presets.find((p) => p.symbol.toUpperCase() === u);
    return t?.address ?? null;
  }

  function setLdxPair(sellSym: string, buySym: string) {
    const s = addressForSymbol(sellSym);
    const b = addressForSymbol(buySym);
    if (!s || !b) return;
    setSellToken(s);
    setBuyToken(b);
    setQuote(null);
    setQuoteError(null);
  }

  function flipTokens() {
    setArrowSpin(true);
    window.setTimeout(() => setArrowSpin(false), 320);
    const s = sellToken;
    setSellToken(buyToken);
    setBuyToken(s);
    setQuote(null);
    setQuoteError(null);
    setAllowanceOk(null);
    setTxHash(null);
  }

  function slippagePctLabel() {
    const n = Number(slippage);
    if (!Number.isFinite(n) || n <= 0) return "—";
    const pct = n * 100;
    return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%`;
  }

  function priceImpactDisplay() {
    if (!quote) return "—";
    const raw = (quote as { estimatedPriceImpact?: string }).estimatedPriceImpact;
    if (raw != null && String(raw).length > 0) return String(raw).includes("%") ? String(raw) : `${raw}%`;
    return "<0.01%";
  }

  function formatUnits(value: string | number | bigint | null | undefined, decimals: number) {
    if (value === null || value === undefined) return "—";
    const bi = typeof value === "bigint" ? value : BigInt(String(value));
    const neg = bi < 0n;
    const x = neg ? -bi : bi;
    const base = 10n ** BigInt(decimals);
    const whole = x / base;
    const frac = x % base;
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
    return `${neg ? "-" : ""}${whole.toString()}${fracStr ? `.${fracStr.slice(0, 6)}` : ""}`;
  }

  const buyDecimals = quote?.tokenMetadata?.buyToken?.decimals ?? buyPreset?.decimals ?? 18;
  const sellDecimals = quote?.tokenMetadata?.sellToken?.decimals ?? sellPreset?.decimals ?? 18;

  function toUnits(amount: string, decimals: number) {
    // minimal decimal -> integer string for calldata
    const [a, b = ""] = amount.trim().split(".");
    const frac = (b + "0".repeat(decimals)).slice(0, decimals);
    const whole = (a || "0").replace(/^0+(?=\d)/, "");
    return `${whole}${frac}`.replace(/^0+$/, "0");
  }

  async function requestQuote() {
    try {
      setLoading(true);
      setQuoteError(null);
      setQuote(null);
      const decimals = sellPreset?.decimals ?? 18;
      const sellAmount = toUnits(sellAmountBase, decimals);
      const body = {
        chainId,
        sellToken,
        buyToken,
        sellAmount,
        slippagePercentage: Number(slippage),
        taker: wallet.address || undefined
      };
      const data = await apiPost<QuoteResponse>("/v1/swap/quote", body);
      if (data?.ok !== true || data.quote == null) throw new Error("Quote failed");
      setQuote(data.quote);
      setTxHash(null);
      setAllowanceOk(null);
      await refreshAllowance(data.quote);
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAllowance(activeQuote: typeof quote = quote) {
    if (!wallet.provider || wallet.status !== "connected" || !wallet.address) return;
    if (!activeQuote?.allowanceTarget) return;
    try {
      const data = encodeAllowance(wallet.address, activeQuote.allowanceTarget);
      const res = await wallet.provider.request({
        method: "eth_call",
        params: [{ to: sellToken, data: `0x${data}` }, "latest"]
      });
      const current = hexToBigInt(String(res));
      const needed = BigInt(activeQuote.sellAmount || "0");
      setAllowanceOk(current >= needed);
    } catch {
      setAllowanceOk(null);
    }
  }

  async function approveIfNeeded() {
    if (!wallet.provider || wallet.status !== "connected" || !wallet.address) {
      setQuoteError("Connect wallet first");
      return;
    }
    if (!quote?.allowanceTarget) {
      setQuoteError("Quote missing allowanceTarget");
      return;
    }
    setSending("approving");
    setQuoteError(null);
    try {
      const data = encodeApprove(quote.allowanceTarget, maxUint256Hex());
      const hash = await wallet.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.address,
            to: sellToken,
            data: `0x${data}`
          }
        ]
      });
      setTxHash(String(hash));
      // optimistic: let user proceed; refresh in background
      setAllowanceOk(true);
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setSending("idle");
    }
  }

  async function signAndSwap() {
    if (!wallet.provider || wallet.status !== "connected" || !wallet.address) {
      setQuoteError("Connect wallet first");
      return;
    }
    if (!quote) {
      setQuoteError("Get a quote first");
      return;
    }
    if (allowanceOk === false) {
      setQuoteError("Approve token allowance first");
      return;
    }
    setSending("swapping");
    setQuoteError(null);
    try {
      const decimals = sellPreset?.decimals ?? 18;
      const sellAmount = toUnits(sellAmountBase, decimals);
      const body = {
        chainId,
        sellToken,
        buyToken,
        sellAmount,
        slippagePercentage: Number(slippage),
        taker: wallet.address
      };
      const data = await apiPost<ExecuteResponse>("/v1/swap/execute", body);
      if (data?.ok !== true || !data.tx) throw new Error("Execute failed");

      const tx = data.tx;
      const reward = data.referralReward;
      const hash = await wallet.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.address,
            to: tx.to,
            data: tx.data,
            value: tx.value || "0x0"
          }
        ]
      });
      setTxHash(String(hash));
      if (reward?.id) {
        try {
          await apiPost("/v1/referral/ledger/confirm", { id: reward.id, txHash: String(hash) });
        } catch {
          // ignore; ledger can remain pending and be confirmed later
        }
      }
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setSending("idle");
    }
  }

  return (
    <PageShell
      title="Swap"
      subtitle="Swap tokens using aggregated on-chain liquidity."
    >
      <Grid>
        <Span col={12}>
          <div className="mb-3 flex flex-col gap-3">
            {!connectedChainSupported && wallet.status === "connected" ? (
              <Card title="Unsupported network" tone="danger">
                <div className="text-sm leading-relaxed text-white/90">
                  This network is not supported for swap yet. Switch to BSC to continue.
                  <div className="mt-2.5">
                    <Button onClick={() => wallet.switchChain(56)}>Switch to BSC</Button>
                  </div>
                </div>
              </Card>
            ) : null}
            {chainMismatch ? (
              <Card title="Network mismatch" tone="info">
                <div className="text-sm leading-relaxed text-white/90">
                  Wallet is on <b>{chainName(wallet.chainId)}</b> but the form is set to <b>{chainName(chainId)}</b>.
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (wallet.chainId && TOKENS[wallet.chainId as ChainId]) {
                          const cid = wallet.chainId as ChainId;
                          setChainId(cid);
                          const p = TOKENS[cid] || [];
                          if (p[0]) setSellToken(p[0].address);
                          if (p[1]) setBuyToken(p[1].address);
                          setQuote(null);
                          setQuoteError(null);
                        }
                      }}
                    >
                      Sync to wallet
                    </Button>
                    <Button onClick={() => wallet.switchChain(chainId)}>Switch wallet here</Button>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B0F1A] p-5 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">🔄 Swap</h2>
                <p className="mt-0.5 text-sm text-gray-400">Best price • Low fees</p>
                {chainId === 56 && LDX_BSC_EXPLORER ? (
                  <a
                    href={LDX_BSC_EXPLORER}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-[#00c896] hover:underline"
                  >
                    LDX on BscScan
                  </a>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                <div className="text-right text-xs text-white/60">
                  {wallet.status === "connected" ? (
                    <>
                      <div className="font-mono text-white/90">
                        {wallet.address?.slice(0, 6)}…{wallet.address?.slice(-4)}
                      </div>
                      <div>{chainName(wallet.chainId)}</div>
                    </>
                  ) : (
                    <span>Not connected</span>
                  )}
                </div>
                <Button variant="secondary" className="!px-3 !py-2 !text-xs" onClick={() => wallet.connect()}>
                  {wallet.status === "connected" ? "Connected" : "Connect wallet"}
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-white/50">Network</label>
              <select
                value={String(chainId)}
                onChange={(e) => {
                  const next = Number(e.target.value) as ChainId;
                  setChainId(next);
                  if (wallet.status === "connected") wallet.switchChain(next).catch(() => {});
                  const p = TOKENS[next] || [];
                  if (p[0]) setSellToken(p[0].address);
                  if (p[1]) setBuyToken(p[1].address);
                  setQuote(null);
                  setQuoteError(null);
                  setAllowanceOk(null);
                  setTxHash(null);
                  setSending("idle");
                }}
                disabled={wallet.status === "connected"}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#00c896]/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="1">Ethereum (1)</option>
                <option value="56">BSC (56)</option>
                <option value="137">Polygon (137)</option>
                <option value="42161">Arbitrum (42161)</option>
                <option value="43114">Avalanche (43114)</option>
              </select>
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium text-white/50">From</div>
              <div className="mt-1.5 space-y-2 rounded-xl bg-white/5 p-4">
                <select
                  value={sellToken}
                  onChange={(e) => {
                    setSellToken(e.target.value);
                    setQuote(null);
                    setQuoteError(null);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#00c896]/40"
                >
                  {presets.map((t) => (
                    <option key={`sell-${t.symbol}-${t.address}`} value={t.address}>
                      {t.symbol}
                      {t.name && t.name !== t.symbol ? ` — ${t.name}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  value={sellAmountBase}
                  onChange={(e) => setSellAmountBase(e.target.value)}
                  placeholder="0.0"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-base font-semibold tabular-nums text-white outline-none placeholder:text-white/30 focus:border-[#00c896]/40"
                />
              </div>
            </div>

            <div className="my-3 flex justify-center">
              <button
                type="button"
                onClick={flipTokens}
                title="Swap direction"
                className={`rounded-full bg-white/10 p-2 text-lg text-white/90 transition-transform duration-300 hover:bg-white/[0.14] ${arrowSpin ? "rotate-180" : ""}`}
              >
                ⇅
              </button>
            </div>

            <div>
              <div className="text-xs font-medium text-white/50">To</div>
              <div className="mt-1.5 space-y-2 rounded-xl bg-white/5 p-4">
                <select
                  value={buyToken}
                  onChange={(e) => {
                    setBuyToken(e.target.value);
                    setQuote(null);
                    setQuoteError(null);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#00c896]/40"
                >
                  {presets.map((t) => (
                    <option key={`buy-${t.symbol}-${t.address}`} value={t.address}>
                      {t.symbol}
                      {t.name && t.name !== t.symbol ? ` — ${t.name}` : ""}
                    </option>
                  ))}
                </select>
                <div className="min-h-[2.75rem] rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-base font-semibold tabular-nums text-white/90">
                  {quote ? (
                    <>
                      {formatUnits(quote.buyAmount, buyDecimals)} <span className="text-sm text-white/50">{buyPreset?.symbol}</span>
                    </>
                  ) : (
                    <span className="text-white/35">Estimated amount</span>
                  )}
                </div>
              </div>
            </div>

            {showLdxQuickPairs ? (
              <div className="mt-4">
                <div className="text-xs text-white/45">LDX routes (BSC)</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["LDX", "USDT"],
                      ["USDT", "LDX"],
                      ["LDX", "BNB"],
                      ["BNB", "LDX"],
                      ["LDX", "ETH"],
                      ["ETH", "LDX"]
                    ] as const
                  ).map(([a, b]) => (
                    <button
                      key={`${a}-${b}`}
                      type="button"
                      onClick={() => setLdxPair(a, b)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/85 hover:border-[#00c896]/35 hover:bg-white/[0.08]"
                    >
                      {a} → {b}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setSlippagePanelOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-left transition hover:bg-white/[0.07]"
              >
                <span className="text-sm text-white/90">
                  Slippage <span className="opacity-50">⚙️</span>
                </span>
                <span className="text-sm text-gray-400">{slippagePctLabel()}</span>
              </button>
              {slippagePanelOpen ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(
                    [
                      { label: "0.1%", val: "0.001" },
                      { label: "0.5%", val: "0.005" },
                      { label: "1%", val: "0.01" }
                    ] as const
                  ).map(({ label, val }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setSlippage(val);
                        saveTradingPreferences({ slippageDecimal: val });
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        slippage === val ? "border-[#00c896]/50 bg-[#00c896]/15 text-[#b8f5e0]" : "border-white/10 bg-white/5 text-white/80"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <input
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    onBlur={() => {
                      const n = Number(slippage);
                      if (Number.isFinite(n) && n > 0 && n < 1) saveTradingPreferences({ slippageDecimal: slippage });
                    }}
                    placeholder="Custom"
                    className="w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-[#00c896]/40"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-4 space-y-1 text-xs text-gray-400">
              <div>Price impact: {priceImpactDisplay()}</div>
              <div>Routing: 0x Aggregator</div>
              <div>
                Network fee:{" "}
                {quote?.transaction?.gas ? `~${String(quote.transaction.gas)} gas` : "Estimated at send time"}
              </div>
              {quote?.allowanceTarget ? (
                <div className="text-white/50">
                  Allowance: {allowanceOk === null ? "Checking…" : allowanceOk ? "Ready" : "Approval required"}
                </div>
              ) : null}
            </div>

            {quoteError ? <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200/95">{quoteError}</div> : null}

            <div className="mt-4">
              <button
                type="button"
                disabled={
                  loading ||
                  sending !== "idle" ||
                  (Boolean(quote?.allowanceTarget) && allowanceOk === null && Boolean(quote))
                }
                onClick={() => {
                  if (!quote) void requestQuote();
                  else if (quote.allowanceTarget && allowanceOk === false) void approveIfNeeded();
                  else void signAndSwap();
                }}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 py-3 text-center text-sm font-semibold text-[#04120c] shadow-lg shadow-emerald-500/15 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading
                  ? "Fetching best price…"
                  : sending === "approving"
                    ? "Approving…"
                    : sending === "swapping"
                      ? "Confirm in wallet…"
                      : !quote
                        ? "Get Best Price"
                        : quote.allowanceTarget && allowanceOk === false
                          ? "Approve token"
                          : quote.allowanceTarget && allowanceOk === null
                            ? "Checking allowance…"
                            : "Swap Now"}
              </button>
            </div>

            {txHash ? (
              <div className="mt-3 text-xs text-white/70">
                Tx: <span className="font-mono text-white/90">{txHash.slice(0, 10)}…</span>
                {txUrl(chainId, txHash) ? (
                  <a href={txUrl(chainId, txHash) as string} target="_blank" rel="noreferrer" className="ml-2 text-[#7aa7ff] hover:underline">
                    View on explorer
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </Span>
      </Grid>
    </PageShell>
  );
}

