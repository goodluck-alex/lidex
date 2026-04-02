"use client";

import { useMode } from "../../context/mode";
import { Card, Grid, PageShell, Pill, Span } from "../../components/ui";

function ToggleRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 13, opacity: 0.9 }}>{label}</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{value}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { mode } = useMode();
  const isCex = mode === "cex";

  return (
    <PageShell title="Settings" subtitle={isCex ? "Full settings (includes account management)." : "Lite settings (swap + wallet preferences)."}>
      <Grid>
        <Span col={6}>
          <Card title="Preferences" right={<Pill tone="info">UI</Pill>}>
            <ToggleRow label="Theme" value="Dark (default)" />
            <ToggleRow label="Preferred wallet type" value={isCex ? "Custodial + Web3" : "Web3"} />
            <ToggleRow label="Notifications" value="On" />
          </Card>
        </Span>

        <Span col={6}>
          <Card title="Trading defaults" right={<Pill tone="success">Swap</Pill>}>
            <ToggleRow label="Slippage" value="0.5%" />
            <ToggleRow label="Transaction deadline" value="20 min" />
            <ToggleRow label="Gas preference" value="Standard" />
          </Card>
        </Span>

        {isCex ? (
          <Span col={12}>
            <Card title="Account management (CEX only)" right={<Pill tone="success">CEX</Pill>}>
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                Placeholder for:
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, opacity: 0.9 }}>
                  <li>KYC / identity</li>
                  <li>Security (2FA)</li>
                  <li>API keys</li>
                  <li>Session management</li>
                </ul>
              </div>
            </Card>
          </Span>
        ) : null}
      </Grid>
    </PageShell>
  );
}

