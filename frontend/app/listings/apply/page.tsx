"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Grid, PageShell, Pill, Span } from "../../../components/ui";
import { apiPost } from "../../../services/api";
import { chainName } from "../../../utils/chains";

type ApplyResponse =
  | {
      ok: true;
      application: {
        id: string;
        status: string;
        createdAt: number;
        pairWithLdx: boolean;
        automationNote?: string | null;
        auto?: { attempted: boolean; outcome: string };
      };
    }
  | { ok: false; error: string; code?: string };

const CHAINS: { chainId: number; label: string }[] = [
  { chainId: 56, label: "BNB Chain" },
  { chainId: 1, label: "Ethereum" },
  { chainId: 137, label: "Polygon" },
  { chainId: 43114, label: "Avalanche" },
  { chainId: 42161, label: "Arbitrum" },
];

export default function TokenListingApplyPage() {
  const [projectName, setProjectName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [chainId, setChainId] = useState<number>(56);
  const [tokenAddress, setTokenAddress] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [pairWithLdx, setPairWithLdx] = useState(true);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);

  const chainLabel = useMemo(() => chainName(chainId), [chainId]);

  useEffect(() => {
    setMsg(null);
  }, [chainId]);

  async function submit() {
    setMsg(null);
    setAppId(null);
    const d = Number.parseInt(decimals.trim(), 10);
    if (!projectName.trim()) return setMsg("Project name is required.");
    if (!tokenAddress.trim().startsWith("0x")) return setMsg("Token address must start with 0x.");
    if (!symbol.trim()) return setMsg("Symbol is required.");
    if (!Number.isFinite(d) || d < 0 || d > 36) return setMsg("Decimals must be 0..36.");

    setBusy(true);
    try {
      const res = await apiPost<ApplyResponse>("/v1/listings/apply", {
        projectName: projectName.trim(),
        contactEmail: contactEmail.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        chainId,
        tokenAddress: tokenAddress.trim(),
        symbol: symbol.trim(),
        decimals: d,
        pairWithLdx,
        notes: notes.trim() || null,
      });
      if (res.ok) {
        setAppId(res.application.id);
        setMsg(`Submitted. Status: ${res.application.status}.`);
      } else {
        setMsg(res.error || "Submit failed.");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Token listing application"
      subtitle="Submit your token details for review. Tip: pairing with LDX qualifies for free listing incentives."
    >
      <Grid>
        <Span col={7}>
          <Card title="Application" right={<Pill tone="info">Review</Pill>}>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
              />
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Contact email (optional)"
                style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
              />
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="Website URL (optional)"
                style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.82 }}>Chain</div>
                  <select
                    value={String(chainId)}
                    onChange={(e) => setChainId(Number(e.target.value))}
                    style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
                  >
                    {CHAINS.map((c) => (
                      <option key={c.chainId} value={String(c.chainId)}>
                        {c.label} ({c.chainId})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.82 }}>Decimals</div>
                  <input
                    value={decimals}
                    onChange={(e) => setDecimals(e.target.value)}
                    placeholder="18"
                    style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
                  />
                </div>
              </div>

              <input
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder={`Token address on ${chainLabel} (0x…)`}
                style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
              />
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Token symbol (e.g. ABC)"
                style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
              />

              <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, opacity: 0.9 }}>
                <input type="checkbox" checked={pairWithLdx} onChange={(e) => setPairWithLdx(e.target.checked)} />
                Pair with <b>LDX</b> (recommended — eligible for free listing incentives)
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional): links, docs, token type, audit, etc."
                rows={4}
                style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white", resize: "vertical" }}
              />

              <Button disabled={busy} onClick={() => void submit()}>
                {busy ? "Submitting…" : "Submit application"}
              </Button>

              {msg ? <div style={{ fontSize: 12, opacity: 0.9 }}>{msg}</div> : null}
              {appId ? <div style={{ fontSize: 12, opacity: 0.8 }}>Application ID: {appId}</div> : null}
            </div>
          </Card>
        </Span>

        <Span col={5}>
          <Card title="Free listing incentive" right={<Pill tone="success">LDX</Pill>}>
            <div style={{ fontSize: 13, opacity: 0.86, lineHeight: 1.6 }}>
              If you opt to list as <b>TOKEN/LDX</b>, we treat it as a priority track for free listing incentives.
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.78 }}>
                When the server enables automated listing, TOKEN/LDX applications can be published immediately after on-chain
                checks (minimum total supply and matching symbol/decimals). Otherwise your submission stays in the manual queue.
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.78 }}>
                Liquidity is per chain. Once liquidity is live and routing is available, your pair can be activated for trading.
              </div>
            </div>
          </Card>
        </Span>
      </Grid>
    </PageShell>
  );
}

