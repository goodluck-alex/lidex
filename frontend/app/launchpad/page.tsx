"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Grid, PageShell, Pill, Span } from "../../components/ui";
import { useWallet } from "../../wallet/useWallet";
import { useMode } from "../../context/mode";
import { apiGet, apiPost } from "../../services/api";

type SaleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  offerAsset: string;
  payAsset: string;
  pricePayPerToken: string;
  totalOfferTokens: string;
  soldTokens: string;
  remainingTokens: string;
  minTierRank: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
};

type SalesResponse = { ok: boolean; enabled: boolean; quoteAsset?: string; sales: SaleRow[] };

type SaleDetailResponse = { ok: boolean; quoteAsset?: string; sale: SaleRow };

type AllocationRow = {
  id: string;
  saleId: string;
  payAmount: string;
  tokensReceived: string;
  createdAt: string;
  sale: { title: string; slug: string; offerAsset: string; payAsset: string; status: string };
};

type AllocResponse = { ok: boolean; enabled: boolean; allocations: AllocationRow[] };

function windowLabel(s: SaleRow): string {
  const now = Date.now();
  if (s.startsAt && Date.parse(s.startsAt) > now) return `Starts ${new Date(s.startsAt).toLocaleString()}`;
  if (s.endsAt && Date.parse(s.endsAt) < now) return "Ended";
  if (s.startsAt && s.endsAt) return `${new Date(s.startsAt).toLocaleDateString()} – ${new Date(s.endsAt).toLocaleDateString()}`;
  return "—";
}

export default function LaunchpadPage() {
  const wallet = useWallet();
  const { mode } = useMode();
  const isCex = mode === "cex";

  const [salesRes, setSalesRes] = useState<SalesResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SaleRow | null>(null);
  const [payAmount, setPayAmount] = useState("100");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);

  const selectedSale = useMemo(() => {
    if (!selectedId || !salesRes?.sales?.length) return null;
    return salesRes.sales.find((s) => s.id === selectedId) || null;
  }, [selectedId, salesRes]);

  useEffect(() => {
    if (!isCex) {
      setSalesRes(null);
      setSelectedId(null);
      return;
    }
    let cancelled = false;
    apiGet<SalesResponse>("/v1/launchpad/sales")
      .then((r) => {
        if (cancelled) return;
        setSalesRes(r);
        setSelectedId((prev) => {
          if (prev) return prev;
          if (!r.sales?.length) return null;
          const live = r.sales.find((s) => s.status === "live");
          return (live || r.sales[0]).id;
        });
      })
      .catch(() => {
        if (!cancelled) setSalesRes({ ok: false, enabled: false, sales: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [isCex]);

  useEffect(() => {
    if (!isCex || !selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    apiGet<SaleDetailResponse>(`/v1/launchpad/sales/${encodeURIComponent(selectedId)}`)
      .then((r) => {
        if (!cancelled && r.ok && r.sale) setDetail(r.sale);
      })
      .catch(() => {
        if (!cancelled) setDetail(selectedSale);
      });
    return () => {
      cancelled = true;
    };
  }, [isCex, selectedId, selectedSale]);

  async function refreshAllocations() {
    if (!wallet.user || !isCex) {
      setAllocations([]);
      return;
    }
    try {
      const r = await apiGet<AllocResponse>("/v1/launchpad/allocations");
      setAllocations(r.allocations || []);
    } catch {
      setAllocations([]);
    }
  }

  useEffect(() => {
    void refreshAllocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.user?.id, isCex]);

  async function participate() {
    setMsg(null);
    if (!isCex) {
      setMsg("Switch to CEX mode (top bar).");
      return;
    }
    if (!wallet.user) {
      setMsg("Connect wallet and sign in first.");
      return;
    }
    const sale = detail || selectedSale;
    if (!sale) return setMsg("No sale selected.");
    const n = Number.parseFloat(payAmount.trim());
    if (!Number.isFinite(n) || n <= 0) return setMsg("Enter a positive pay amount.");
    setBusy(true);
    try {
      await apiPost<{ ok: boolean; allocation?: unknown; error?: string; code?: string }>("/v1/launchpad/participate", {
        saleId: sale.id,
        payAmount: String(n),
      });
      setMsg("Purchase recorded. Offer tokens credited to your CEX balance.");
      void refreshAllocations();
      const r = await apiGet<SalesResponse>("/v1/launchpad/sales");
      setSalesRes(r);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Participate failed.");
    } finally {
      setBusy(false);
    }
  }

  const sale = detail || selectedSale;
  const enabled = salesRes?.enabled === true;
  const quote = salesRes?.quoteAsset || "USDT";

  return (
    <PageShell
      title="Launchpad"
      subtitle={`CEX: buy launch allocations with custodial ${quote}. Credits a separate offer asset (internal balance). Enable with LAUNCHPAD_ENABLED=true.`}
    >
      {!isCex ? (
        <Card title="Mode">
          <div style={{ opacity: 0.9 }}>Open Launchpad in CEX mode.</div>
        </Card>
      ) : !enabled ? (
        <Card title="Launchpad" right={<Pill tone="info">Off</Pill>}>
          <div style={{ opacity: 0.9 }}>
            Backend flag <b>LAUNCHPAD_ENABLED</b> is not true. Ops can create sales via{" "}
            <code style={{ fontSize: 12 }}>POST /v1/admin/launchpad/sales</code> with <b>ADMIN_API_KEY</b>.
          </div>
        </Card>
      ) : (
        <Grid>
          <Span col={7}>
            <Card title="Sales" right={<Pill tone="success">Live pool</Pill>}>
              <div style={{ display: "grid", gap: 12 }}>
                <select
                  value={selectedId || ""}
                  onChange={(e) => setSelectedId(e.target.value || null)}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "white",
                  }}
                >
                  {(salesRes?.sales || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.status}) · {s.offerAsset}/{s.payAsset}
                    </option>
                  ))}
                </select>

                {sale ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Project</div>
                      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800 }}>{sale.title}</div>
                      {sale.summary ? (
                        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>{sale.summary}</div>
                      ) : null}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Price ({sale.payAsset} / {sale.offerAsset})</div>
                        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800 }}>{sale.pricePayPerToken}</div>
                      </div>
                      <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Remaining</div>
                        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800 }}>{sale.remainingTokens} {sale.offerAsset}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Window: {windowLabel(sale)}
                      {sale.minTierRank > 0 ? (
                        <>
                          {" "}
                          · Staking tier rank <b>≥ {sale.minTierRank}</b> required
                        </>
                      ) : null}
                    </div>
                    <input
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={`Pay amount (${sale.payAsset})`}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "transparent",
                        color: "white",
                      }}
                    />
                    <Button disabled={busy || sale.status !== "live"} onClick={() => void participate()}>
                      {busy ? "Processing…" : sale.status !== "live" ? "Not live" : "Participate"}
                    </Button>
                    {msg ? <div style={{ fontSize: 13, opacity: 0.9 }}>{msg}</div> : null}
                  </div>
                ) : (
                  <div style={{ opacity: 0.8 }}>No public sales yet.</div>
                )}
              </div>
            </Card>
          </Span>

          <Span col={5}>
            <Card title="Your allocations" right={<Pill tone="info">History</Pill>}>
              <div style={{ display: "grid", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                {allocations.length === 0 ? (
                  <div style={{ opacity: 0.75, fontSize: 13 }}>No purchases yet (sign in to track).</div>
                ) : (
                  allocations.map((a) => (
                    <div
                      key={a.id}
                      style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", fontSize: 12 }}
                    >
                      <div style={{ fontWeight: 700 }}>{a.sale?.title}</div>
                      <div style={{ opacity: 0.85 }}>
                        +{a.tokensReceived} {a.sale?.offerAsset} · paid {a.payAmount} {a.sale?.payAsset}
                      </div>
                      <div style={{ opacity: 0.65 }}>{new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <div style={{ marginTop: 12 }}>
              <Card title="Rules">
                <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85, lineHeight: 1.7, fontSize: 13 }}>
                  <li>Settlement is <b>custodial</b>: pay from your CEX {quote} balance.</li>
                  <li>You receive <b>{sale?.offerAsset || "OFFER"}</b> as an internal balance (IOU until withdrawal policy exists).</li>
                  <li>KYC / geo may apply per your deployment; this MVP does not gate in code.</li>
                  <li>Optional <b>min staking tier rank</b> is enforced when set on a sale.</li>
                </ul>
              </Card>
            </div>
          </Span>
        </Grid>
      )}
    </PageShell>
  );
}
