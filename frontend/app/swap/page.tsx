"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMode } from "../../context/mode";
import { Button, Card, Grid, PageShell, Pill, Span } from "../../components/ui";
import { ResponsivePanels } from "../../components/ResponsivePanels";
import { TOKENS, type ChainId } from "../../utils/tokens";
import { encodeAllowance, encodeApprove, hexToBigInt, maxUint256Hex } from "../../utils/erc20";
import { chainName, txUrl } from "../../utils/chains";
import { useWallet } from "../../wallet/useWallet";
import { lidexModeHeaders } from "../../services/api";

export default function SwapPage() {
  const { mode } = useMode();
  const isCex = mode === "cex";

  const wallet = useWallet();
  const [chainId, setChainId] = useState<ChainId>(56);
  const presets = useMemo(() => TOKENS[chainId] || [], [chainId]);
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

  const sellPreset = presets.find((t) => t.address.toLowerCase() === sellToken.toLowerCase());
  const buyPreset = presets.find((t) => t.address.toLowerCase() === buyToken.toLowerCase());

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
  }, [wallet.status, wallet.chainId]);

  const connectedChainSupported = wallet.status !== "connected" || !wallet.chainId ? true : !!TOKENS[wallet.chainId as ChainId];
  const chainMismatch =
    wallet.status === "connected" && wallet.chainId != null && Number(wallet.chainId) !== Number(chainId);

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
    // minimal decimal -> integer string (good enough for Phase 1)
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/v1/swap/quote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...lidexModeHeaders() },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || `Quote failed (${res.status})`);
      setQuote(data.quote);
      setTxHash(null);
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAllowance() {
    if (!wallet.provider || wallet.status !== "connected" || !wallet.address) return;
    if (!quote?.allowanceTarget) return;
    try {
      // allowance(owner, spender)
      const data = encodeAllowance(wallet.address, quote.allowanceTarget);
      const res = await wallet.provider.request({
        method: "eth_call",
        params: [{ to: sellToken, data: `0x${data}` }, "latest"]
      });
      const current = hexToBigInt(String(res));
      const needed = BigInt(quote.sellAmount || "0");
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/v1/swap/execute`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...lidexModeHeaders() },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || `Execute failed (${res.status})`);

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
          await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/v1/referral/ledger/confirm`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json", ...lidexModeHeaders() },
            body: JSON.stringify({ id: reward.id, txHash: String(hash) })
          });
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
      subtitle={
        isCex
          ? "Swap (powered by 0x routing in Phase 1). CEX mode can show optional panels, but it’s still the same DEX swap engine."
          : "DEX Lite swap experience (powered by 0x routing)."
      }
    >
      <Grid>
        <Span col={isCex ? 7 : 6}>
          <Card title="Swap" right={<Pill tone="success">{isCex ? "CEX Full" : "DEX Lite"}</Pill>}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Wallet:{" "}
                  <span style={{ opacity: 0.95 }}>
                    {wallet.status === "unavailable"
                      ? "No provider"
                      : wallet.status === "connected"
                        ? `${wallet.address?.slice(0, 6)}…${wallet.address?.slice(-4)}`
                        : "Disconnected"}
                  </span>
                  {wallet.status === "connected" ? (
                    <span style={{ marginLeft: 10, opacity: 0.8 }}>
                      Network: <span style={{ opacity: 0.95 }}>{chainName(wallet.chainId)}</span>
                    </span>
                  ) : null}
                </div>
                <Button variant="secondary" onClick={() => wallet.connect()}>
                  {wallet.status === "connected" ? "Connected" : "Connect wallet"}
                </Button>
              </div>

              {!connectedChainSupported && wallet.status === "connected" ? (
                <Card title="Unsupported network" tone="danger">
                  <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.55 }}>
                    Your wallet is on a network we don’t support yet in Phase 1. Switch to BSC to continue.
                    <div style={{ marginTop: 10 }}>
                      <Button onClick={() => wallet.switchChain(56)}>Switch to BSC</Button>
                    </div>
                  </div>
                </Card>
              ) : null}

              {chainMismatch ? (
                <Card title="Network mismatch" tone="info">
                  <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.55 }}>
                    Wallet network is <b>{chainName(wallet.chainId)}</b> but the UI is set to chain <b>{chainName(chainId)}</b>.
                    For best results, keep them the same.
                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                        Sync UI to wallet
                      </Button>
                      <Button onClick={() => wallet.switchChain(chainId)}>Switch wallet to UI chain</Button>
                    </div>
                  </div>
                </Card>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Chain {wallet.status === "connected" ? "(follows wallet)" : "(select)"}
                  </div>
                  <select
                    value={String(chainId)}
                    onChange={(e) => {
                      const next = Number(e.target.value) as ChainId;
                      setChainId(next);
                      if (wallet.status === "connected") {
                        wallet.switchChain(next).catch(() => {});
                      }
                      const p = TOKENS[next] || [];
                      if (p[0]) setSellToken(p[0].address);
                      if (p[1]) setBuyToken(p[1].address);
                      setQuote(null);
                      setQuoteError(null);
                    }}
                    disabled={wallet.status === "connected"}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "transparent",
                      color: "white",
                      opacity: wallet.status === "connected" ? 0.8 : 1,
                      cursor: wallet.status === "connected" ? "not-allowed" : "pointer"
                    }}
                  >
                    <option value="1">Ethereum (1)</option>
                    <option value="56">BSC (56)</option>
                    <option value="137">Polygon (137)</option>
                    <option value="42161">Arbitrum (42161)</option>
                    <option value="43114">Avalanche (43114)</option>
                  </select>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Slippage</div>
                  <input
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    placeholder="0.005"
                    style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>From</div>
                  <select
                    value={sellToken}
                    onChange={(e) => {
                      setSellToken(e.target.value);
                      setQuote(null);
                      setQuoteError(null);
                    }}
                    style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
                  >
                    {presets.map((t) => (
                      <option key={t.address} value={t.address}>
                        {t.symbol}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>To</div>
                  <select
                    value={buyToken}
                    onChange={(e) => {
                      setBuyToken(e.target.value);
                      setQuote(null);
                      setQuoteError(null);
                    }}
                    style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
                  >
                    {presets.map((t) => (
                      <option key={t.address} value={t.address}>
                        {t.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Amount</div>
                  <input
                    value={sellAmountBase}
                    onChange={(e) => setSellAmountBase(e.target.value)}
                    placeholder="0.01"
                    style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Preview</div>
                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
                    {sellPreset?.symbol || "Token"} → {buyPreset?.symbol || "Token"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Quote: <span style={{ opacity: 0.95 }}>{quote ? "Ready" : loading ? "Loading..." : "—"}</span>{" "}
                  {quote?.allowanceTarget ? (
                    <span style={{ marginLeft: 8, opacity: 0.85 }}>
                      Allowance:{" "}
                      {allowanceOk === null ? "—" : allowanceOk ? "OK" : "Needs approval"}
                    </span>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Button
                    variant="secondary"
                    onClick={() => refreshAllowance()}
                  >
                    Check Allowance
                  </Button>
                  <Button onClick={requestQuote}>{loading ? "Quoting..." : "Get Quote"}</Button>
                </div>
              </div>

              {quote ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    variant="secondary"
                    onClick={approveIfNeeded}
                  >
                    {sending === "approving" ? "Approving..." : "Approve"}
                  </Button>
                  <Button onClick={signAndSwap}>
                    {sending === "swapping" ? "Swapping..." : "Sign & Swap"}
                  </Button>
                </div>
              ) : null}

              {txHash ? (
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Tx: <span style={{ opacity: 0.95 }}>{txHash}</span>
                  {txUrl(chainId, txHash) ? (
                    <a
                      href={txUrl(chainId, txHash) as string}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginLeft: 10, color: "white", opacity: 0.85 }}
                    >
                      View on explorer →
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>
        </Span>

        <Span col={isCex ? 5 : 6}>
          {!isCex ? (
            <Card title="Transaction status" tone="info">
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                Waiting for wallet connection and quote.
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                  DEX mode hides orderbook/charts/custodial actions.
                </div>
              </div>
            </Card>
          ) : (
            <ResponsivePanels
              tabs={[
                { id: "status", label: "Status" },
                { id: "chart", label: "Mini chart" },
                { id: "routing", label: "Routing" },
                { id: "fees", label: "Fees" }
              ] as const}
              renderMobile={(active) => (
                <Grid columns={12} gap={12}>
                  <Span col={12}>
                    {active === "status" ? (
                      <Card title="Transaction status" tone="info">
                        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                          {quoteError ? `Error: ${quoteError}` : quote ? "Quote loaded. Ready to sign tx (next step)." : "Get a quote to continue."}
                        </div>
                      </Card>
                    ) : null}
                    {active === "chart" ? (
                      <Card title="Mini chart" tone="success">
                        <div style={{ height: 180, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.18)", display: "grid", placeItems: "center", opacity: 0.75 }}>
                          Chart placeholder
                        </div>
                      </Card>
                    ) : null}
                    {active === "routing" ? (
                      <Card title="Routing / Depth" tone="success">
                        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>
                          {quote?.route?.fills?.length
                            ? `Fills: ${quote.route.fills.length}`
                            : quote
                              ? "Route available (details depend on 0x response)."
                              : "Get a quote to view routing."}
                        </div>
                      </Card>
                    ) : null}
                    {active === "fees" ? (
                      <Card title="Summary" tone="success" right={<Pill>Quote</Pill>}>
                        {!quote ? (
                          <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>Get a quote to view summary.</div>
                        ) : (
                          <div style={{ display: "grid", gap: 8, fontSize: 13, opacity: 0.88, lineHeight: 1.5 }}>
                            <div>
                              Estimated output:{" "}
                              <b>
                                {formatUnits(quote.buyAmount, buyDecimals)} {buyPreset?.symbol || "Token"}
                              </b>
                            </div>
                            <div>
                              Platform fee (0.5%):{" "}
                              <b>
                                {quote?.fees?.integratorFee?.amount
                                  ? `${formatUnits(quote.fees.integratorFee.amount, buyDecimals)} ${buyPreset?.symbol || "Token"}`
                                  : "—"}
                              </b>
                            </div>
                            <div>
                              0x fee:{" "}
                              <b>
                                {quote?.fees?.zeroExFee?.amount
                                  ? `${formatUnits(quote.fees.zeroExFee.amount, buyDecimals)} ${buyPreset?.symbol || "Token"}`
                                  : "—"}
                              </b>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>
                              Sell amount: {formatUnits(quote.sellAmount, sellDecimals)} {sellPreset?.symbol || "Token"}
                            </div>
                            {quote?.transaction?.gas ? (
                              <div style={{ fontSize: 12, opacity: 0.75 }}>Estimated gas: {quote.transaction.gas}</div>
                            ) : null}
                          </div>
                        )}
                      </Card>
                    ) : null}
                  </Span>
                </Grid>
              )}
            >
              <Card title="Transaction status" tone="info">
                <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                  {quoteError ? `Error: ${quoteError}` : quote ? "Quote loaded. Next: wallet signing (Phase 1+)." : "Click Get Quote to fetch a 0x quote."}
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                    In CEX mode, optional panels can appear for routing, chart, and fee tier preview.
                  </div>
                </div>
              </Card>

              <div style={{ marginTop: 12 }}>
                <Card title="Summary" tone="success" right={<Pill>Quote</Pill>}>
                  {!quote ? (
                    <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>Get a quote to view summary.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8, fontSize: 13, opacity: 0.88, lineHeight: 1.5 }}>
                      <div>
                        Estimated output:{" "}
                        <b>
                          {formatUnits(quote.buyAmount, buyDecimals)} {buyPreset?.symbol || "Token"}
                        </b>
                      </div>
                      <div>
                        Platform fee (0.5%):{" "}
                        <b>
                          {quote?.fees?.integratorFee?.amount
                            ? `${formatUnits(quote.fees.integratorFee.amount, buyDecimals)} ${buyPreset?.symbol || "Token"}`
                            : "—"}
                        </b>
                      </div>
                      <div>
                        0x fee:{" "}
                        <b>
                          {quote?.fees?.zeroExFee?.amount
                            ? `${formatUnits(quote.fees.zeroExFee.amount, buyDecimals)} ${buyPreset?.symbol || "Token"}`
                            : "—"}
                        </b>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Sell amount: {formatUnits(quote.sellAmount, sellDecimals)} {sellPreset?.symbol || "Token"}
                      </div>
                      {quote?.transaction?.gas ? (
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Estimated gas: {quote.transaction.gas}</div>
                      ) : null}
                    </div>
                  )}
                </Card>
              </div>
            </ResponsivePanels>
          )}
        </Span>
      </Grid>
    </PageShell>
  );
}

