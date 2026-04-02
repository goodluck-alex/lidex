"use client";

import { Card, Grid, PageShell, Pill, Span } from "../../components/ui";

export default function LaunchpadPage() {
  return (
    <PageShell title="Launchpad" subtitle="CEX Full: token launch participation via LDX/USDT.">
      <Grid>
        <Span col={7}>
          <Card title="Active sale" right={<Pill tone="success">Live</Pill>}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Project</div>
                <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800 }}>—</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Price</div>
                  <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800 }}>—</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Allocation</div>
                  <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800 }}>—</div>
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>Buy amount</div>
              <button style={{ border: "1px solid rgba(0,0,0,0.2)", background: "#00C896", color: "#071016", padding: "10px 12px", borderRadius: 12, fontWeight: 800, cursor: "pointer" }}>
                Participate
              </button>
            </div>
          </Card>
        </Span>

        <Span col={5}>
          <Card title="Participation stats" right={<Pill tone="info">Stats</Pill>}>
            <div style={{ height: 220, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.18)", display: "grid", placeItems: "center", opacity: 0.75 }}>
              Progress / cap / your share placeholder
            </div>
          </Card>
          <div style={{ marginTop: 12 }}>
            <Card title="Rules">
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85, lineHeight: 1.7, fontSize: 13 }}>
                <li>KYC / eligibility (if required)</li>
                <li>Tier-based allocation</li>
                <li>Vesting schedule</li>
              </ul>
            </Card>
          </div>
        </Span>
      </Grid>
    </PageShell>
  );
}

