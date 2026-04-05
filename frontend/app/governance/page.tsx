"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Grid, PageShell, Pill } from "../../components/ui";

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ opacity: 0.72, fontSize: 13, lineHeight: 1.45 }}>{children}</div>;
}
import { useWallet } from "../../wallet/useWallet";
import { useMode } from "../../context/mode";
import { apiGet, apiPost } from "../../services/api";

type ProposalRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  powerBasis: string;
  powerBasisLabel?: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  acceptingVotes?: boolean;
};

type Tallies = {
  yes: string;
  no: string;
  abstain: string;
  totalWeight: string;
  voteCount: number;
};

type ProposalDetail = ProposalRow & {
  tallies: Tallies;
  myVote: { choice: string; weight: string; updatedAt: string } | null;
  myPower: string | null;
};

type ListResponse = { ok: boolean; enabled: boolean; asset?: string; proposals: ProposalRow[] };

type DetailResponse = { ok: boolean; enabled: boolean; asset?: string; proposal: ProposalDetail | null };

function statusPill(p: ProposalRow): React.ReactNode {
  if (p.status === "active" && p.acceptingVotes) return <Pill tone="success">Voting open</Pill>;
  if (p.status === "active") return <Pill tone="info">Active</Pill>;
  if (p.status === "closed") return <Pill tone="muted">Closed</Pill>;
  return <Pill tone="muted">{p.status}</Pill>;
}

export default function GovernancePage() {
  const wallet = useWallet();
  const { mode } = useMode();
  const isCex = mode === "cex";
  const authed = wallet.status === "connected" && !!wallet.user?.id;

  const [listRes, setListRes] = useState<ListResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selectedProposal = useMemo(() => {
    if (!selected || !listRes?.proposals?.length) return null;
    return listRes.proposals.find((p) => p.id === selected || p.slug === selected) || null;
  }, [selected, listRes]);

  useEffect(() => {
    if (!isCex) {
      setListRes(null);
      setSelected(null);
      setDetail(null);
      return;
    }
    let cancelled = false;
    apiGet<ListResponse>("/v1/governance/signals")
      .then((r) => {
        if (cancelled) return;
        setListRes(r);
        setSelected((prev) => {
          if (prev) return prev;
          const open = r.proposals?.find((p) => p.acceptingVotes);
          if (open) return open.id;
          return r.proposals?.[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) setListRes({ ok: false, enabled: false, proposals: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [isCex]);

  useEffect(() => {
    if (!isCex || !selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    apiGet<DetailResponse>(`/v1/governance/signals/${encodeURIComponent(selected)}`)
      .then((r) => {
        if (cancelled) return;
        setDetail(r);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isCex, selected, authed, wallet.user?.id]);

  async function vote(choice: "yes" | "no" | "abstain") {
    if (!selected || !authed) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiPost<DetailResponse>(`/v1/governance/signals/${encodeURIComponent(selected)}/vote`, {
        choice,
      });
      if (r.ok && r.proposal) {
        setDetail(r);
        setMsg("Vote recorded.");
      } else {
        setMsg((r as { error?: string }).error || "Vote failed");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isCex) {
    return (
      <PageShell title="Governance" subtitle="Community polls are available in full trading mode.">
        <Card>
          <Muted>Switch to full trading mode in the header to view and vote on polls.</Muted>
        </Card>
      </PageShell>
    );
  }

  const p = detail?.proposal;
  const asset = detail?.asset || listRes?.asset || "LDX";

  return (
    <PageShell
      title="Governance signaling"
      subtitle="Community signal polls. Results are informational and do not bind the platform."
    >
      <Grid columns={2} gap={16}>
        <Card>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Proposals</div>
          {!listRes?.enabled ? (
            <Muted>Signaling is disabled on this deployment.</Muted>
          ) : !listRes.proposals.length ? (
            <Muted>No public proposals yet.</Muted>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {listRes.proposals.map((row) => {
                const active = row.id === selected || row.slug === selected;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelected(row.id)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: active ? "1px solid rgba(0, 200, 150, 0.45)" : "1px solid rgba(255,255,255,0.1)",
                      background: active ? "rgba(0, 200, 150, 0.08)" : "rgba(255,255,255,0.03)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700 }}>{row.title}</span>
                      {statusPill(row)}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>{row.powerBasisLabel || row.powerBasis}</div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Detail</div>
          {!selectedProposal || !p ? (
            <Muted>Select a proposal.</Muted>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 18 }}>{p.title}</span>
                {statusPill(p)}
              </div>
              {p.description ? (
                <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.88, whiteSpace: "pre-wrap" }}>{p.description}</div>
              ) : null}
              <div style={{ fontSize: 12, opacity: 0.72 }}>
                Weight: {p.powerBasisLabel || p.powerBasis} · denomination {asset}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(0,200,150,0.1)" }}>
                  <div style={{ opacity: 0.7 }}>Yes</div>
                  <div style={{ fontWeight: 800 }}>{p.tallies.yes}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,90,90,0.1)" }}>
                  <div style={{ opacity: 0.7 }}>No</div>
                  <div style={{ fontWeight: 800 }}>{p.tallies.no}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ opacity: 0.7 }}>Abstain</div>
                  <div style={{ fontWeight: 800 }}>{p.tallies.abstain}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>
                Votes: {p.tallies.voteCount} · total weight: {p.tallies.totalWeight} {asset}
              </div>

              {authed ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, opacity: 0.75 }}>Your power: {p.myPower ?? "—"}</span>
                  {p.myVote ? (
                    <Pill tone="muted">
                      You voted {p.myVote.choice} (weight {p.myVote.weight})
                    </Pill>
                  ) : null}
                </div>
              ) : (
                <Muted>Sign in (Wallet) to vote.</Muted>
              )}

              {p.acceptingVotes && authed ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Button disabled={busy} onClick={() => void vote("yes")}>
                    Vote yes
                  </Button>
                  <Button disabled={busy} variant="danger" onClick={() => void vote("no")}>
                    Vote no
                  </Button>
                  <Button disabled={busy} variant="secondary" onClick={() => void vote("abstain")}>
                    Abstain
                  </Button>
                </div>
              ) : null}

              {msg ? <div style={{ fontSize: 12, opacity: 0.85 }}>{msg}</div> : null}
            </div>
          )}
        </Card>
      </Grid>
    </PageShell>
  );
}
