"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Grid, PageShell, Pill } from "../../components/ui";
import { useWallet } from "../../wallet/useWallet";
import { useMode } from "../../context/mode";
import { apiGet, apiPost } from "../../services/api";

type MarginPos = {
  id: string;
  side: string;
  leverage: number;
  collateralQuote: string;
  sizeBase: string;
  entryPrice: string;
  status: string;
  markPrice: string | null;
  unrealizedPnlQuote: string | null;
  equityQuote: string | null;
  maintenanceQuote: string | null;
  liquidatable?: boolean;
  realizedPnlQuote?: string | null;
  closeReason?: string | null;
  createdAt: string;
  closedAt?: string | null;
};

type PositionsResponse = {
  ok: boolean;
  enabled: boolean;
  positions: MarginPos[];
  marginMaxLeverage?: number;
  marginMinLeverage?: number;
  marginMinCollateralQuote?: string;
  marginMaintenanceBps?: number;
  marginQuoteAsset?: string;
  marginSymbol?: string;
};

export default function MarginPage() {
  const wallet = useWallet();
  const { mode } = useMode();
  const isCex = mode === "cex";
  const authed = wallet.status === "connected" && !!wallet.user?.id;

  const [data, setData] = useState<PositionsResponse | null>(null);
  const [side, setSide] = useState<"long" | "short">("long");
  const [lev, setLev] = useState(3);
  const [collateral, setCollateral] = useState("50");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!authed || !isCex) {
      setData(null);
      return;
    }
    try {
      const r = await apiGet<PositionsResponse>("/v1/cex/margin/positions");
      setData(r);
    } catch {
      setData({ ok: false, enabled: false, positions: [] });
    }
  }, [authed, isCex]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openPos() {
    setMsg(null);
    setBusy(true);
    try {
      await apiPost("/v1/cex/margin/open", {
        side,
        leverage: lev,
        collateralQuote: collateral,
      });
      setMsg("Position opened.");
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Open failed");
    } finally {
      setBusy(false);
    }
  }

  async function closePos(id: string) {
    setMsg(null);
    setBusy(true);
    try {
      await apiPost("/v1/cex/margin/close", { positionId: id });
      setMsg("Position closed.");
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isCex) {
    return (
      <PageShell title="Margin" subtitle="Switch to CEX mode. Margin uses custodial quote collateral on the internal pair.">
        <Card>
          <div style={{ fontSize: 13, opacity: 0.78 }}>This surface is CEX-only.</div>
        </Card>
      </PageShell>
    );
  }

  const en = data?.enabled === true;
  const q = data?.marginQuoteAsset ?? "USDT";
  const sym = data?.marginSymbol ?? "—";
  const maxL = data?.marginMaxLeverage ?? 5;
  const minL = data?.marginMinLeverage ?? 2;
  const mmBps = data?.marginMaintenanceBps ?? 100;
  const minCol = data?.marginMinCollateralQuote ?? "5";

  return (
    <PageShell
      title="Isolated margin (v0)"
      subtitle={`Synthetic ${sym} exposure — quote collateral only, mark from last trade or book mid. High risk; defaults off — set MARGIN_ENABLED=true.`}
    >
      <Grid columns={2} gap={16}>
        <Card>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Open position</div>
          {!en ? (
            <div style={{ fontSize: 13, opacity: 0.82 }}>
              Margin is <b>disabled</b>. Ops: <code>MARGIN_ENABLED=true</code>, tune{" "}
              <code>MARGIN_MAX_LEVERAGE</code>, <code>MARGIN_MAINTENANCE_BPS</code>.
            </div>
          ) : !authed ? (
            <div style={{ fontSize: 13, opacity: 0.82 }}>Sign in (Wallet) to trade.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant={side === "long" ? "primary" : "secondary"} style={{ fontSize: 12 }} onClick={() => setSide("long")}>
                  Long
                </Button>
                <Button variant={side === "short" ? "primary" : "secondary"} style={{ fontSize: 12 }} onClick={() => setSide("short")}>
                  Short
                </Button>
              </div>
              <label style={{ fontSize: 12, opacity: 0.78 }}>
                Leverage ({minL}–{maxL})
                <input
                  type="number"
                  min={minL}
                  max={maxL}
                  value={lev}
                  onChange={(e) => setLev(Number(e.target.value))}
                  style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
                />
              </label>
              <label style={{ fontSize: 12, opacity: 0.78 }}>
                Collateral ({q}, min {minCol})
                <input
                  value={collateral}
                  onChange={(e) => setCollateral(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
                />
              </label>
              <div style={{ fontSize: 11, opacity: 0.68, lineHeight: 1.45 }}>
                Notional ≈ collateral × leverage. Liquidation when equity &lt; maintenance ({mmBps / 100}% of mark notional, isolated). Fees on close like taker on notional.
              </div>
              <Button disabled={busy} onClick={() => void openPos()}>
                Open {side}
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Positions</div>
          {!en ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>—</div>
          ) : !authed ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>—</div>
          ) : !data?.positions?.length ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>No positions yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, fontSize: 12 }}>
              {data.positions.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>
                      {p.side} {p.leverage}×
                    </span>
                    {p.status === "open" ? (
                      p.liquidatable ? (
                        <Pill tone="info">Liquidatable</Pill>
                      ) : (
                        <Pill tone="success">Open</Pill>
                      )
                    ) : (
                      <Pill tone="muted">{p.status}</Pill>
                    )}
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 6, lineHeight: 1.5 }}>
                    Size {p.sizeBase} · entry {p.entryPrice} · collat {p.collateralQuote} {q}
                    {p.markPrice ? (
                      <>
                        <br />
                        Mark {p.markPrice} · uPnL {p.unrealizedPnlQuote ?? "—"} · equity {p.equityQuote ?? "—"}
                        <br />
                        Maint. req. {p.maintenanceQuote ?? "—"}
                      </>
                    ) : null}
                    {p.status !== "open" && p.realizedPnlQuote != null ? (
                      <>
                        <br />
                        Realized {p.realizedPnlQuote} {q} {p.closeReason ? `(${p.closeReason})` : ""}
                      </>
                    ) : null}
                  </div>
                  {p.status === "open" ? (
                    <Button variant="secondary" style={{ fontSize: 11, marginTop: 8 }} disabled={busy} onClick={() => void closePos(p.id)}>
                      Close at mark
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </Grid>
      {msg ? <div style={{ marginTop: 14, fontSize: 13 }}>{msg}</div> : null}
    </PageShell>
  );
}
