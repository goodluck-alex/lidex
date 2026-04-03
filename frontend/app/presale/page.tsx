"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMode } from "../../context/mode";
import { Button, Card, Grid, PageShell, Pill, Span } from "../../components/ui";
import { apiGet } from "../../services/api";
import { useWallet } from "../../wallet/useWallet";
import { chainName, contractUrl, txUrl } from "../../utils/chains";
import { encodeAllowance, encodeApprove, hexToBigInt, maxUint256Hex } from "../../utils/erc20";
import { encodePresalePurchase, parsePresaleAmount, txValueHex } from "../../lib/presaleTx";
import { formatCountdown, presaleWindowOpen } from "../../lib/presaleWindow";

type LiquidityPair = { symbol: string; quote: string; liquidityUrl: string | null };

type ScheduleInfo = {
  startAt: number | null;
  endAt: number | null;
  windowOpen: boolean;
  source: { start: "contract" | "env" | null; end: "contract" | "env" | null };
};

type OnchainConfig = {
  chainId: number;
  contractAddress: string;
  ready: boolean;
  buyEnabled: boolean;
  paymentMode: "native" | "erc20";
  nativeSymbol: string;
  paymentToken: { address: string; symbol: string; decimals: number } | null;
  purchaseFunction: string;
};

type PresaleResponse = {
  ok: true;
  chainId: number;
  token: {
    symbol: string;
    name: string;
    decimals: number;
    address: string;
    totalSupply: string;
    explorerUrl: string | null;
  } | null;
  presale: {
    active: boolean;
    contractAddress: string | null;
    externalUrl: string | null;
    instructions: string;
  };
  schedule: ScheduleInfo;
  onchain: OnchainConfig | null;
  liquidity: { summary: string; pairs: LiquidityPair[] };
  trading: { summary: string; pairSymbols: string[] };
};

function PresaleScheduleCountdown({ schedule, nowMs }: { schedule: ScheduleInfo; nowMs: number }) {
  const { startAt, endAt } = schedule;
  const beforeStart = startAt != null && nowMs < startAt;
  const afterEnd = endAt != null && nowMs > endAt;
  const live = presaleWindowOpen(startAt, endAt, nowMs);

  const sourceHint = [schedule.source.start, schedule.source.end].some((s) => s === "contract")
    ? "Times read from presale contract (RPC)."
    : [schedule.source.start, schedule.source.end].some((s) => s === "env")
      ? "Times from backend env (overrides contract when set)."
      : null;

  let main = "";
  let sub: string | null = null;
  if (beforeStart && startAt != null) {
    main = `Starts in ${formatCountdown(startAt - nowMs)}`;
    if (endAt != null) sub = `Closes ${new Date(endAt).toISOString().replace("T", " ").slice(0, 19)} UTC`;
  } else if (afterEnd) {
    main = "Presale ended";
    if (endAt != null) sub = `Ended ${new Date(endAt).toISOString().replace("T", " ").slice(0, 19)} UTC`;
  } else if (live) {
    main = "Presale is live";
    if (endAt != null) sub = `Ends in ${formatCountdown(endAt - nowMs)}`;
    else sub = "No end time configured.";
  } else {
    main = "Schedule";
    sub = "Unable to derive status from current times.";
  }

  return (
    <Card title="Countdown" right={<Pill tone={live && !afterEnd ? "success" : "info"}>Schedule</Pill>}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{main}</div>
      {sub ? (
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.88, lineHeight: 1.5 }}>
          {sub}
        </div>
      ) : null}
      {sourceHint ? (
        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.62 }}>{sourceHint}</div>
      ) : null}
      {startAt != null ? (
        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.65 }}>
          Start: {new Date(startAt).toISOString().replace("T", " ").slice(0, 19)} UTC
        </div>
      ) : null}
      {endAt != null ? (
        <div style={{ fontSize: 11, opacity: 0.65 }}>
          End: {new Date(endAt).toISOString().replace("T", " ").slice(0, 19)} UTC
        </div>
      ) : null}
    </Card>
  );
}

function PresaleBuyPanel({
  onchain,
  presaleActive,
  schedule,
  nowMs,
}: {
  onchain: OnchainConfig;
  presaleActive: boolean;
  schedule: ScheduleInfo;
  nowMs: number;
}) {
  const wallet = useWallet();
  const [amount, setAmount] = useState(onchain.paymentMode === "native" ? "0.1" : "100");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState<"idle" | "approving" | "buy">("idle");
  const [allowanceOk, setAllowanceOk] = useState<boolean | null>(null);

  const windowOpen = presaleWindowOpen(schedule.startAt, schedule.endAt, nowMs);
  const canPurchase = presaleActive && onchain.ready && windowOpen;

  const payDecimals = onchain.paymentMode === "native" ? 18 : onchain.paymentToken?.decimals ?? 18;
  const paySymbol = onchain.paymentMode === "native" ? onchain.nativeSymbol : onchain.paymentToken?.symbol ?? "TOKEN";
  const explorerContract = contractUrl(onchain.chainId, onchain.contractAddress);

  const beforeStart = schedule.startAt != null && nowMs < schedule.startAt;
  const afterEnd = schedule.endAt != null && nowMs > schedule.endAt;

  useEffect(() => {
    setAmount(onchain.paymentMode === "native" ? "0.1" : "100");
  }, [onchain.paymentMode]);

  const neededAmount = useMemo(() => {
    try {
      return parsePresaleAmount(amount, payDecimals);
    } catch {
      return null;
    }
  }, [amount, payDecimals]);

  const refreshAllowance = useCallback(async () => {
    if (onchain.paymentMode !== "erc20" || !onchain.paymentToken) {
      setAllowanceOk(true);
      return;
    }
    if (!wallet.provider || wallet.status !== "connected" || !wallet.address) {
      setAllowanceOk(null);
      return;
    }
    if (neededAmount == null) {
      setAllowanceOk(null);
      return;
    }
    try {
      const data = encodeAllowance(wallet.address, onchain.contractAddress);
      const res = await wallet.provider.request({
        method: "eth_call",
        params: [{ to: onchain.paymentToken.address, data: `0x${data}` }, "latest"],
      });
      const current = hexToBigInt(String(res));
      setAllowanceOk(current >= neededAmount);
    } catch {
      setAllowanceOk(null);
    }
  }, [
    onchain.contractAddress,
    onchain.paymentMode,
    onchain.paymentToken,
    neededAmount,
    wallet.address,
    wallet.provider,
    wallet.status,
  ]);

  useEffect(() => {
    void refreshAllowance();
  }, [refreshAllowance]);

  const wrongChain = wallet.status === "connected" && wallet.chainId != null && wallet.chainId !== onchain.chainId;

  async function approve() {
    if (!onchain.paymentToken || !wallet.provider || !wallet.address) {
      setErr("Connect wallet first");
      return;
    }
    setSending("approving");
    setErr(null);
    setTxHash(null);
    try {
      const data = encodeApprove(onchain.contractAddress, maxUint256Hex());
      const hash = await wallet.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.address,
            to: onchain.paymentToken.address,
            data: `0x${data}`,
          },
        ],
      });
      setTxHash(String(hash));
      setAllowanceOk(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setSending("idle");
    }
  }

  async function buy() {
    if (!wallet.provider || wallet.status !== "connected" || !wallet.address) {
      setErr("Connect wallet first");
      return;
    }
    if (wallet.chainId !== onchain.chainId) {
      setErr(`Switch wallet to ${chainName(onchain.chainId)}`);
      return;
    }
    if (!canPurchase) {
      if (!presaleActive) setErr("Presale is paused (PRESALE_ACTIVE is false).");
      else if (!onchain.ready) setErr("Presale payment token is not configured.");
      else if (beforeStart) setErr("Presale has not started yet.");
      else if (afterEnd) setErr("Presale has ended.");
      else setErr("Purchasing is not available right now.");
      return;
    }
    if (onchain.paymentMode === "erc20" && allowanceOk === false) {
      setErr("Approve the payment token first.");
      return;
    }
    let amountBase: bigint;
    try {
      amountBase = parsePresaleAmount(amount, payDecimals);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid amount");
      return;
    }
    setSending("buy");
    setErr(null);
    setTxHash(null);
    try {
      const data = encodePresalePurchase({
        paymentMode: onchain.paymentMode,
        purchaseFunction: onchain.purchaseFunction,
        amount: amountBase,
      });
      const value = txValueHex(onchain.paymentMode, amountBase);
      const hash = await wallet.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.address,
            to: onchain.contractAddress,
            data,
            value,
          },
        ],
      });
      setTxHash(String(hash));
      if (onchain.paymentMode === "erc20") void refreshAllowance();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setSending("idle");
    }
  }

  return (
    <Card title="Buy on-chain" right={<Pill tone={canPurchase ? "success" : "info"}>Wallet</Pill>}>
      <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.55 }}>
        {!onchain.ready ? (
          <div style={{ opacity: 0.9 }}>
            Presale contract is set but payment is not ready (e.g. missing <code>PRESALE_PAYMENT_TOKEN</code> for ERC-20
            mode). Fix backend env and reload.
          </div>
        ) : !presaleActive ? (
          <div style={{ opacity: 0.9 }}>Presale is paused (<code>PRESALE_ACTIVE</code> is false).</div>
        ) : !windowOpen ? (
          <div style={{ opacity: 0.9 }}>
            {beforeStart
              ? `Purchasing opens when the schedule starts (see Countdown).`
              : afterEnd
                ? "This presale window has closed."
                : "Purchasing is not available."}
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
          <div style={{ opacity: 0.85 }}>
            Network: <b>{chainName(onchain.chainId)}</b> · Pay with <b>{paySymbol}</b> · Call{" "}
            <code>
              {onchain.purchaseFunction}({onchain.paymentMode === "erc20" ? "uint256 amount" : ""})
            </code>
          </div>
          <Button variant="secondary" onClick={() => wallet.connect()}>
            {wallet.status === "connected" ? "Wallet connected" : "Connect wallet"}
          </Button>
        </div>

        {wallet.status === "connected" && wrongChain ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={{ opacity: 0.9 }}>Wallet is on {chainName(wallet.chainId)}.</span>
            <Button onClick={() => wallet.switchChain(onchain.chainId)}>Switch to {chainName(onchain.chainId)}</Button>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Amount ({paySymbol})</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!canPurchase}
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "white",
            }}
          />
          <div style={{ fontSize: 11, opacity: 0.65 }}>
            Ensure your presale contract uses the same function name and argument shape (empty payable call vs single uint256). Configure{" "}
            <code>PRESALE_PURCHASE_FN</code> and <code>PRESALE_PAYMENT_MODE</code> on the backend if yours differs.
          </div>
        </div>

        {onchain.paymentMode === "erc20" && onchain.paymentToken ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <Button
              variant="secondary"
              disabled={!canPurchase || wallet.status !== "connected" || wrongChain || sending !== "idle"}
              onClick={() => void approve()}
            >
              {sending === "approving" ? "Approving…" : "Approve token"}
            </Button>
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              Allowance:{" "}
              {allowanceOk === null
                ? "—"
                : allowanceOk
                  ? "sufficient"
                  : "approve required"}
            </span>
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Button
            disabled={
              !canPurchase ||
              wallet.status !== "connected" ||
              wrongChain ||
              sending !== "idle" ||
              (onchain.paymentMode === "erc20" && allowanceOk === false)
            }
            onClick={() => void buy()}
          >
            {sending === "buy" ? "Confirm in wallet…" : `Buy with ${paySymbol}`}
          </Button>
          {explorerContract ? (
            <a href={explorerContract} target="_blank" rel="noopener noreferrer" style={{ color: "#00C896", alignSelf: "center" }}>
              Contract on explorer →
            </a>
          ) : null}
        </div>

        {err ? (
          <div style={{ color: "#ff6b6b", fontSize: 13 }} role="alert">
            {err}
          </div>
        ) : null}
        {txHash ? (
          <div style={{ fontSize: 13 }}>
            Tx:{" "}
            {txUrl(wallet.chainId || onchain.chainId, txHash) ? (
              <a href={txUrl(wallet.chainId || onchain.chainId, txHash)!} target="_blank" rel="noopener noreferrer" style={{ color: "#00C896" }}>
                {txHash.slice(0, 10)}…
              </a>
            ) : (
              <code>{txHash}</code>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default function PresalePage() {
  const router = useRouter();
  const { mode } = useMode();
  const isCex = mode === "cex";
  const [data, setData] = useState<PresaleResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await apiGet<PresaleResponse>("/v1/presale");
        if (!c) setData(res);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <PageShell
      title="LDX launch"
      subtitle="Phase 2 — presale, liquidity, and trading pairs (LDX / USDT, ETH, BNB on BSC)."
    >
      <Grid>
        <Span col={12}>
          {err ? (
            <Card title="Error" tone="danger">
              <div style={{ fontSize: 13 }}>{err}</div>
            </Card>
          ) : !data ? (
            <Card title="Loading">
              <div style={{ fontSize: 13, opacity: 0.8 }}>Fetching launch config…</div>
            </Card>
          ) : (
            <Grid>
              <Span col={isCex ? 6 : 12}>
                <Card title={`${data.token?.symbol || "LDX"} token`} right={<Pill tone="info">BSC</Pill>}>
                  {data.token ? (
                    <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.55 }}>
                      <div>
                        {data.token.name} — {data.token.totalSupply} max supply (human units)
                      </div>
                      <div style={{ wordBreak: "break-all", opacity: 0.9 }}>
                        Contract: <code>{data.token.address}</code>
                      </div>
                      {data.token.explorerUrl ? (
                        <a href={data.token.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#00C896" }}>
                          View on BscScan →
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ opacity: 0.85 }}>No LDX address for this chain in config.</div>
                  )}
                </Card>
              </Span>

              <Span col={isCex ? 6 : 12}>
                <Card title="Presale" right={<Pill tone={data.presale.active ? "success" : "info"}>Phase 2</Pill>}>
                  <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.9 }}>{data.presale.instructions}</div>
                  <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {data.presale.contractAddress ? (
                      <div style={{ fontSize: 12, wordBreak: "break-all", opacity: 0.85 }}>
                        Presale contract: <code>{data.presale.contractAddress}</code>
                      </div>
                    ) : null}
                    {data.presale.externalUrl ? (
                      <Button variant="secondary" onClick={() => window.open(data.presale.externalUrl!, "_blank")}>
                        Open presale site
                      </Button>
                    ) : null}
                  </div>
                </Card>
              </Span>

              <Span col={12}>
                {data.schedule.startAt != null || data.schedule.endAt != null ? (
                  <PresaleScheduleCountdown schedule={data.schedule} nowMs={nowMs} />
                ) : (
                  <Card title="Countdown" right={<Pill tone="info">Schedule</Pill>}>
                    <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.55 }}>
                      No presale window loaded yet. The backend will read <code>startTime()</code> / <code>endTime()</code> from your
                      presale contract (see <code>PRESALE_RPC_URL</code>, <code>PRESALE_TIME_START_FN</code>,{" "}
                      <code>PRESALE_TIME_END_FN</code>) or use <code>PRESALE_START_UNIX</code> / <code>PRESALE_END_UNIX</code> (seconds)
                      in <code>.env</code>.
                    </div>
                  </Card>
                )}
              </Span>

              {data.onchain ? (
                <Span col={12}>
                  <PresaleBuyPanel onchain={data.onchain} presaleActive={data.presale.active} schedule={data.schedule} nowMs={nowMs} />
                </Span>
              ) : null}

              <Span col={12}>
                <Card title="Liquidity creation" right={<Pill>Pancake</Pill>}>
                  <div style={{ fontSize: 13, opacity: 0.88, marginBottom: 10 }}>{data.liquidity.summary}</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.liquidity.pairs.map((p) => (
                      <div
                        key={p.symbol}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 10,
                          padding: 12,
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{p.symbol}</span>
                        {p.liquidityUrl ? (
                          <a href={p.liquidityUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#00C896", fontSize: 13 }}>
                            Add liquidity on PancakeSwap →
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, opacity: 0.7 }}>Link available on BSC only in this build.</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </Span>

              <Span col={12}>
                <Card title="Trading pairs" right={<Pill tone="success">DEX</Pill>}>
                  <div style={{ fontSize: 13, opacity: 0.88, marginBottom: 10 }}>{data.trading.summary}</div>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                    {data.trading.pairSymbols.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 14 }}>
                    <Button onClick={() => router.push("/dex/swap")}>Open DEX swap</Button>
                  </div>
                </Card>
              </Span>
            </Grid>
          )}
        </Span>
      </Grid>
    </PageShell>
  );
}
