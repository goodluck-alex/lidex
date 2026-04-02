"use client";

import { useMode } from "../../context/mode";
import { Card, Grid, PageShell, Pill, Span } from "../../components/ui";

export default function DocsPage() {
  const { mode } = useMode();
  const isCex = mode === "cex";

  return (
    <PageShell
      title="Help / Docs"
      subtitle="Implementation guide for the Lidex hybrid UI (what appears in DEX Lite vs CEX Full)."
    >
      <Grid>
        <Span col={12}>
          <Card title="Landing page (moved here)" right={<Pill tone="info">Docs</Pill>}>
            <div style={{ fontSize: 13, opacity: 0.88, lineHeight: 1.6 }}>
              The detailed “mode selection + feature lists + quick links” content was removed from the homepage and kept here to keep the landing page clean.
            </div>
          </Card>
        </Span>

        <Span col={12}>
          <Card title="Current mode" right={<Pill tone={isCex ? "info" : "success"}>{isCex ? "CEX Full" : "DEX Lite"}</Pill>}>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
              Mode controls:
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, opacity: 0.9 }}>
                <li>Navigation visibility</li>
                <li>Route access (CEX-only routes redirect in DEX)</li>
                <li>Wallet feature set (custodial disabled in DEX)</li>
              </ul>
            </div>
          </Card>
        </Span>

        <Span col={6}>
          <Card title="DEX (Lite) pages" right={<Pill tone="success">Lite</Pill>}>
            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.8, fontSize: 13 }}>
              <li>/dex/swap (0x-powered swap; old /swap redirects here)</li>
              <li>/markets</li>
              <li>/wallet (web3 only)</li>
              <li>/referral (basic)</li>
              <li>/settings</li>
            </ul>
          </Card>
        </Span>

        <Span col={6}>
          <Card title="CEX (Full) adds" right={<Pill tone="info">Full</Pill>}>
            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.8, fontSize: 13 }}>
              <li>/cex/trade (CEX dashboard; old /trade redirects here)</li>
              <li>/staking</li>
              <li>/launchpad</li>
              <li>Wallet: custodial deposit/withdraw/transfer</li>
              <li>Referral: levels/users/bonuses</li>
            </ul>
          </Card>
        </Span>
      </Grid>
    </PageShell>
  );
}

