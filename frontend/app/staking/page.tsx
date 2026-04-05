"use client";

import React, { useEffect, useState } from "react";
import { Card, Grid, PageShell, Pill, Span, Button } from "../../components/ui";
import { useWallet } from "../../wallet/useWallet";
import { useMode } from "../../context/mode";
import { apiGet, apiPost } from "../../services/api";

type StakePool = {
  id: string;
  asset: string;
  label: string;
  tiers: { id: string; label: string; minStake: string; feeBps: number; referralBoostBps: number; isPremium: boolean }[];
};

type StakeTier = {
  id: string;
  label: string;
  feeBps: number;
  referralBoostBps: number;
  isPremium: boolean;
  minStake: string;
};

type StakePositionsResponse = {
  ok: boolean;
  user: { id: string; address: string } | null;
  positions: { id: string; poolId: string; asset: string; stakedAmount: string; createdAt: string; updatedAt: string }[];
  tier: StakeTier | null;
};

export default function StakingPage() {
  const wallet = useWallet();
  const { mode } = useMode();
  const isCex = mode === "cex";

  const [pools, setPools] = useState<StakePool[]>([]);
  const [positions, setPositions] = useState<StakePositionsResponse | null>(null);
  const [amount, setAmount] = useState("1000");
  const [busy, setBusy] = useState<"stake" | "unstake" | "idle">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ ok: boolean; pools: StakePool[] }>("/v1/staking/pools")
      .then((r) => {
        if (!cancelled) setPools(r.pools || []);
      })
      .catch(() => {
        if (!cancelled) setPools([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshPositions() {
    if (!wallet.user || !isCex) {
      setPositions(null);
      return;
    }
    try {
      const r = await apiGet<StakePositionsResponse>("/v1/staking/positions");
      setPositions(r);
    } catch (e) {
      setPositions(null);
    }
  }

  useEffect(() => {
    void refreshPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.user?.id, isCex]);

  async function doStake(kind: "stake" | "unstake") {
    if (!wallet.user || !isCex) {
      setMsg("Connect wallet and sign in (CEX mode) first.");
      return;
    }
    const n = Number.parseFloat(amount.trim());
    if (!Number.isFinite(n) || n <= 0) {
      setMsg("Enter a positive amount.");
      return;
    }
    setBusy(kind);
    setMsg(null);
    try {
      const res = await apiPost<StakePositionsResponse>(`/v1/staking/${kind}`, { amount: amount.trim() });
      if (!res.ok) {
        const err = (res as any).error || "Operation failed";
        setMsg(String(err));
      } else {
        setPositions(res);
        setMsg(kind === "stake" ? "Staked successfully." : "Unstaked successfully.");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy("idle");
    }
  }

  const pool = pools[0];
  const tier = positions?.tier || null;
  const stakedAmt = positions?.positions?.[0]?.stakedAmount || "0";

  return (
    <PageShell title="Staking" subtitle="Stake LDX, view positions, and track tier benefits.">
      <Grid>
        <Span col={7}>
          <Card title="Stake LDX" right={<Pill tone="success">Tiers</Pill>}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {pool ? (
                  <>
                    Pool: <strong>{pool.label}</strong> · Asset: <strong>{pool.asset}</strong>
                  </>
                ) : (
                  "Loading pool…"
                )}
              </div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount LDX"
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "white",
                  fontSize: 13,
                }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Button disabled={busy !== "idle"} onClick={() => void doStake("stake")}>
                  {busy === "stake" ? "Staking…" : "Stake"}
                </Button>
                <Button
                  disabled={busy !== "idle"}
                  variant="secondary"
                  onClick={() => void doStake("unstake")}
                >
                  {busy === "unstake" ? "Unstaking…" : "Unstake"}
                </Button>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
                Staking uses your internal CEX LDX balance (no on-chain contract). Benefits depend on your tier.
              </div>
              {msg ? (
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  {msg}
                </div>
              ) : null}
            </div>
          </Card>
        </Span>

        <Span col={5}>
          <Card title="Your position" right={<Pill tone="info">Tier</Pill>}>
            {positions && positions.positions.length > 0 ? (
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <div>
                  Staked: <strong>{stakedAmt}</strong> {pool?.asset || "LDX"}.
                </div>
                {tier ? (
                  <div>
                    Tier: <strong>{tier.label}</strong> · Fee bps: <strong>{tier.feeBps}</strong> · Referral boost:{" "}
                    <strong>{tier.referralBoostBps / 100}%</strong> {tier.isPremium ? "· Premium" : null}
                  </div>
                ) : (
                  <div style={{ opacity: 0.8 }}>No tier yet. Stake more LDX to unlock discounts and boosts.</div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.8 }}>No staked LDX yet.</div>
            )}
          </Card>
          <div style={{ marginTop: 12 }}>
            <Card title="Tier benefits">
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85, lineHeight: 1.7, fontSize: 13 }}>
                <li>Lower taker fees on CEX trades (per tier fee bps).</li>
                <li>Higher referral rewards (per tier referral boost).</li>
                <li>Premium tiers can unlock extra features later.</li>
              </ul>
            </Card>
          </div>
        </Span>
      </Grid>
    </PageShell>
  );
}

