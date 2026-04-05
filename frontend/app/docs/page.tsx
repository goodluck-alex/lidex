"use client";

import { Card, Grid, PageShell, Span } from "../../components/ui";

const prose: React.CSSProperties = { fontSize: 14, lineHeight: 1.65, opacity: 0.88 };
const listStyle: React.CSSProperties = { margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.75, opacity: 0.9 };

export default function DocsPage() {
  return (
    <PageShell title="About Lidex Exchange" subtitle="Lidex — Trade Freely. Trade Powerfully.">
      <Grid>
        <Span col={12}>
          <Card>
            <div style={prose}>
              <p style={{ margin: 0 }}>
                Lidex is a next-generation hybrid cryptocurrency exchange designed to combine the freedom of decentralized
                trading with the power and performance of centralized platforms. Our architecture gives users the flexibility
                to choose how they trade — whether through a lightweight decentralized experience or a full-featured
                professional trading environment.
              </p>
            </div>
          </Card>
        </Span>

        <Span col={12}>
          <Card title="Hybrid Trading Experience">
            <div style={prose}>
              <p style={{ margin: 0 }}>Lidex operates in two modes:</p>
              <ul style={listStyle}>
                <li>
                  <strong>DEX (Lite)</strong> — A fast, non-custodial experience focused on simplicity and user control.
                </li>
                <li>
                  <strong>CEX (Full)</strong> — A complete trading environment with advanced tools, liquidity, and expanded
                  earning opportunities.
                </li>
              </ul>
              <p style={{ margin: "14px 0 0" }}>
                This dual-mode system ensures users can seamlessly transition between decentralized and centralized features
                based on their needs — all within one platform.
              </p>
            </div>
          </Card>
        </Span>

        <Span col={12}>
          <Card title="DEX (Lite) features">
            <div style={prose}>
              <p style={{ margin: 0 }}>The Lite mode is designed for speed, security, and self-custody:</p>
              <ul style={listStyle}>
                <li>Swap tokens using 0x-powered trading</li>
                <li>Market overview and price tracking</li>
                <li>Web3 wallet connectivity</li>
                <li>Basic referral system</li>
                <li>User settings and preferences</li>
              </ul>
              <p style={{ margin: "14px 0 0" }}>
                This mode prioritizes decentralization, meaning custodial wallet features are disabled and users maintain full
                control of their assets.
              </p>
            </div>
          </Card>
        </Span>

        <Span col={12}>
          <Card title="CEX (Full) features">
            <div style={prose}>
              <p style={{ margin: 0 }}>Full mode unlocks advanced trading and earning capabilities:</p>
              <ul style={listStyle}>
                <li>Professional trading dashboard</li>
                <li>Staking and passive earning options</li>
                <li>Launchpad for new crypto projects</li>
                <li>Custodial wallet (deposit, withdraw, transfer)</li>
                <li>Advanced referral program with levels and bonuses</li>
              </ul>
            </div>
          </Card>
        </Span>

        <Span col={12}>
          <Card title="Designed for flexibility">
            <div style={prose}>
              <p style={{ margin: 0 }}>
                Lidex intelligently manages navigation, routes, and wallet features depending on the selected mode, ensuring a
                clean and focused user experience. This allows beginners to start simple while giving advanced traders the
                tools they need to scale.
              </p>
            </div>
          </Card>
        </Span>

        <Span col={12}>
          <Card title="Our mission">
            <div style={prose}>
              <p style={{ margin: 0 }}>
                At Lidex, our mission is to bridge decentralized freedom with centralized efficiency — creating a secure,
                scalable, and user-friendly trading platform for everyone. Whether you&apos;re a beginner, trader, or investor,
                Lidex is built to help you trade smarter and grow confidently. 🚀
              </p>
            </div>
          </Card>
        </Span>

        <Span col={12}>
          <Card title="For developers &amp; operators">
            <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.6 }}>
              Technical notes and environment configuration for builders are in the repository under{" "}
              <code style={{ fontSize: 12 }}>docs/ui-developer-reference.md</code> and the rest of the <code>docs/</code>{" "}
              folder.
            </div>
          </Card>
        </Span>
      </Grid>
    </PageShell>
  );
}
