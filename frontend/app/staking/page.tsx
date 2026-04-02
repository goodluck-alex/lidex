"use client";

import { Card, Grid, PageShell, Pill, Span } from "../../components/ui";

export default function StakingPage() {
  return (
    <PageShell title="Staking" subtitle="CEX Full: stake LDX, view positions, rewards, tiers.">
      <Grid>
        <Span col={7}>
          <Card title="Stake LDX" right={<Pill tone="success">APR</Pill>}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>Amount</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button style={{ border: "1px solid rgba(0,0,0,0.2)", background: "#00C896", color: "#071016", padding: "10px 12px", borderRadius: 12, fontWeight: 800, cursor: "pointer" }}>
                  Stake
                </button>
                <button style={{ border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.10)", color: "white", padding: "10px 12px", borderRadius: 12, fontWeight: 800, cursor: "pointer" }}>
                  Unstake
                </button>
              </div>
              <div style={{ fontSize: 12, opacity: 0.72 }}>Rewards calculation + tiers placeholder.</div>
            </div>
          </Card>
        </Span>

        <Span col={5}>
          <Card title="Your positions" right={<Pill tone="info">Lock</Pill>}>
            <div style={{ fontSize: 13, opacity: 0.8 }}>No positions yet.</div>
          </Card>
          <div style={{ marginTop: 12 }}>
            <Card title="Tier benefits">
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85, lineHeight: 1.7, fontSize: 13 }}>
                <li>Trading fee discount</li>
                <li>Referral boost</li>
                <li>Launchpad allocation</li>
              </ul>
            </Card>
          </div>
        </Span>
      </Grid>
    </PageShell>
  );
}

