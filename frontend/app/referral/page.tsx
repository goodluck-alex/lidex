"use client";

import React, { useEffect, useState } from "react";
import { useMode } from "../../context/mode";
import { Button, Card, Grid, PageShell, Pill, Span } from "../../components/ui";
import { ResponsivePanels } from "../../components/ResponsivePanels";
import { apiGet } from "../../services/api";
import { useWallet } from "../../wallet/useWallet";

type ReferredUser = { address: string; attachedAt: number };

type ReferralStats = {
  direct: number;
  earnedUsd: number;
  level: number;
  tiers?: { level1: number; level2: number; level3: number };
  referredUsers?: ReferredUser[];
};

type LedgerEntry = {
  id: string;
  chainId: number;
  parentAddress: string;
  childAddress: string;
  feeToken: string;
  integratorFeeAmount: string;
  rewardAmount: string;
  status: "pending" | "confirmed";
  txHash?: string;
  createdAt: number;
};

type ReferralLinkResponse = { ok: true; link: string; code?: string | null };
type ReferralStatsResponse = { ok: true; stats: ReferralStats; ledger?: LedgerEntry[]; user?: any | null };

function formatPct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function ReferralLinkRow({ link, loading }: { link: string; loading: boolean }) {
  const ready = !loading && Boolean(link) && link !== "—";
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", fontSize: 13, opacity: 0.9, wordBreak: "break-all" }}>
        {loading ? "…" : link}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Button variant="secondary" disabled={!ready} onClick={() => ready && void navigator.clipboard.writeText(link)}>
          Copy
        </Button>
        <Button
          variant="secondary"
          disabled={!ready}
          onClick={() => {
            if (!ready) return;
            void (async () => {
              try {
                if (typeof navigator !== "undefined" && navigator.share) {
                  await navigator.share({ title: "Lidex", url: link });
                } else {
                  await navigator.clipboard.writeText(link);
                }
              } catch {
                /* user cancelled share or clipboard denied */
              }
            })();
          }}
        >
          Share
        </Button>
      </div>
    </div>
  );
}

export default function ReferralPage() {
  const { mode } = useMode();
  const isCex = mode === "cex";
  const wallet = useWallet();

  const [link, setLink] = useState<string>("—");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [l, s] = await Promise.all([
          apiGet<ReferralLinkResponse>(`/v1/referral/link`),
          apiGet<ReferralStatsResponse>(`/v1/referral/stats`)
        ]);
        if (cancelled) return;
        setLink(l.link);
        setStats(s.stats);
        setLedger(s.ledger || []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load referral data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet.user]);

  return (
    <PageShell title="Referral">
      {!isCex ? (
        <Grid>
          <Span col={6}>
            <Card title="Your referral link" right={<Pill tone="success">Lite</Pill>}>
              <div style={{ display: "grid", gap: 10 }}>
                <ReferralLinkRow link={link} loading={loading} />
                {error ? (
                  <div style={{ fontSize: 12, opacity: 0.72 }}>Error: {error}</div>
                ) : null}
              </div>
            </Card>
          </Span>

          <Span col={6}>
            <Card title="Stats">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Direct</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{stats?.direct ?? "—"}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Earned</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>
                    {stats ? `$${stats.earnedUsd.toFixed(2)}` : "—"}
                  </div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Level</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{stats?.level ?? 1}</div>
                </div>
              </div>
            </Card>
          </Span>

          <Span col={12}>
            <Card title="Referral tiers" tone="info" right={<Pill>Referral</Pill>}>
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                Tier split (example): L1 {formatPct(stats?.tiers?.level1 ?? 0.3)} / L2{" "}
                {formatPct(stats?.tiers?.level2 ?? 0.1)} / L3 {formatPct(stats?.tiers?.level3 ?? 0.05)}. Level bumps
                from <b>direct referrals</b> who completed attach (3 → L2, 10 → L3).
              </div>
            </Card>
          </Span>

          <Span col={12}>
            <Card title="Direct referrals" right={<Pill tone="success">{stats?.referredUsers?.length ?? 0}</Pill>}>
              {!stats?.referredUsers?.length ? (
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  No one has used your link and logged in yet. Share your link; when they sign in, they attach as your
                  direct referral.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {stats.referredUsers.map((r) => (
                    <div
                      key={r.address}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        fontSize: 12,
                        opacity: 0.9,
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8
                      }}
                    >
                      <span style={{ fontFamily: "ui-monospace, monospace" }}>
                        {r.address.slice(0, 8)}…{r.address.slice(-6)}
                      </span>
                      <span style={{ opacity: 0.75 }}>{new Date(r.attachedAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Span>

          <Span col={12}>
            <Card title="Rewards history" right={<Pill tone="info">{ledger.length}</Pill>}>
              {ledger.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.8 }}>No rewards yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {ledger.slice().reverse().slice(0, 10).map((e) => (
                    <div
                      key={e.id}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        display: "grid",
                        gap: 4,
                        fontSize: 12,
                        opacity: 0.9
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div>Reward: {e.rewardAmount}</div>
                        <div style={{ opacity: 0.75 }}>{e.status}</div>
                      </div>
                      {e.txHash ? (
                        <div style={{ opacity: 0.8 }}>
                          Tx: {e.txHash.slice(0, 10)}…
                        </div>
                      ) : null}
                      <div style={{ opacity: 0.75 }}>
                        Parent: {e.parentAddress.slice(0, 6)}… Child: {e.childAddress.slice(0, 6)}… Chain: {e.chainId}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Span>
        </Grid>
      ) : (
        <ResponsivePanels
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "users", label: "Users" },
            { id: "bonuses", label: "Bonuses" }
          ] as const}
          renderMobile={(active) => (
            <Grid columns={12} gap={12}>
              <Span col={12}>
                {active === "overview" ? (
                  <Grid columns={12} gap={12}>
                    <Span col={12}>
                      <Card title="Your referral link" right={<Pill tone="success">Full</Pill>}>
                        <div style={{ display: "grid", gap: 10 }}>
                          <ReferralLinkRow link={link} loading={loading} />
                          {error ? (
                            <div style={{ fontSize: 12, opacity: 0.72 }}>Error: {error}</div>
                          ) : null}
                        </div>
                      </Card>
                    </Span>
                    <Span col={12}>
                      <Card title="Stats">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>Direct</div>
                            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{stats?.direct ?? "—"}</div>
                          </div>
                          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>Earned</div>
                            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>
                              {stats ? `$${stats.earnedUsd.toFixed(2)}` : "—"}
                            </div>
                          </div>
                          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>Level</div>
                            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{stats?.level ?? "—"}</div>
                          </div>
                        </div>
                      </Card>
                    </Span>
                  </Grid>
                ) : null}

                {active === "users" ? (
                  <Card title="Referred users" right={<Pill tone="info">{stats?.referredUsers?.length ?? 0}</Pill>}>
                    {!stats?.referredUsers?.length ? (
                      <div style={{ fontSize: 13, opacity: 0.8 }}>No direct referrals yet.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {stats.referredUsers.map((r) => (
                          <div
                            key={r.address}
                            style={{
                              padding: 10,
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.10)",
                              fontSize: 12,
                              opacity: 0.9
                            }}
                          >
                            {r.address.slice(0, 10)}…{r.address.slice(-8)}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ) : null}

                {active === "bonuses" ? (
                  <Card title="Bonuses & rules">
                    <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85, lineHeight: 1.7, fontSize: 13 }}>
                      <li>Trading rewards</li>
                      <li>Staking rewards</li>
                      <li>Tiered multipliers</li>
                    </ul>
                  </Card>
                ) : null}
              </Span>
            </Grid>
          )}
        >
          <Grid>
            <Span col={7}>
              <Card title="Referred users" right={<Pill tone="info">{stats?.referredUsers?.length ?? 0}</Pill>}>
                {!stats?.referredUsers?.length ? (
                  <div style={{ fontSize: 13, opacity: 0.8 }}>No direct referrals yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {stats.referredUsers.map((r) => (
                      <div
                        key={r.address}
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.10)",
                          fontSize: 12,
                          opacity: 0.9
                        }}
                      >
                        {r.address.slice(0, 12)}…{r.address.slice(-10)}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Span>
            <Span col={5}>
              <Card title="Your referral link" right={<Pill tone="success">Full</Pill>}>
                <div style={{ display: "grid", gap: 10 }}>
                  <ReferralLinkRow link={link} loading={loading} />
                  {error ? <div style={{ fontSize: 12, opacity: 0.72 }}>Error: {error}</div> : null}
                </div>
              </Card>
              <div style={{ marginTop: 12 }}>
                <Card title="Stats">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Direct</div>
                      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{stats?.direct ?? "—"}</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Earned</div>
                      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>
                        {stats ? `$${stats.earnedUsd.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Level</div>
                      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{stats?.level ?? "—"}</div>
                    </div>
                  </div>
                </Card>
              </div>
              <div style={{ marginTop: 12 }}>
                <Card title="Referral tiers" right={<Pill>Referral</Pill>}>
                  <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                    L1 {formatPct(stats?.tiers?.level1 ?? 0.3)} / L2 {formatPct(stats?.tiers?.level2 ?? 0.1)} / L3{" "}
                    {formatPct(stats?.tiers?.level3 ?? 0.05)}.
                  </div>
                </Card>
              </div>
            </Span>
          </Grid>
        </ResponsivePanels>
      )}
    </PageShell>
  );
}

