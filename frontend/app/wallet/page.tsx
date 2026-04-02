"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMode } from "../../context/mode";
import { Button, Card, Grid, PageShell, Pill, Span } from "../../components/ui";
import { ResponsivePanels } from "../../components/ResponsivePanels";
import { useWallet } from "../../wallet/useWallet";
import { TOKENS, type ChainId } from "../../utils/tokens";
import { getNativeBalance, getErc20Balance } from "../../wallet/balance";
import { chainName } from "../../utils/chains";
import { getNonce, signLoginMessage, verify } from "../../wallet/auth";

export default function WalletPage() {
  const { mode } = useMode();
  const isCex = mode === "cex";
  const wallet = useWallet();

  const [nativeBal, setNativeBal] = useState<string>("—");
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "done">("idle");

  const chainId = (wallet.chainId || 56) as ChainId;
  const presets = useMemo(() => TOKENS[chainId] || [], [chainId]);

  function formatUnitsHex(hex: string, decimals: number) {
    try {
      const bi = BigInt(hex);
      const base = 10n ** BigInt(decimals);
      const whole = bi / base;
      const frac = (bi % base).toString().padStart(decimals, "0").replace(/0+$/, "");
      return `${whole.toString()}${frac ? `.${frac.slice(0, 6)}` : ""}`;
    } catch {
      return "—";
    }
  }

  async function refreshBalances() {
    if (!wallet.provider || !wallet.address) return;
    try {
      setErr(null);
      const nb = await getNativeBalance(wallet.provider, wallet.address);
      setNativeBal(nb);
      const next: Record<string, string> = {};
      for (const t of presets) {
        const b = await getErc20Balance(wallet.provider, t.address, wallet.address);
        next[t.symbol] = b;
      }
      setTokenBalances(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load balances");
    }
  }

  async function doSign() {
    if (!wallet.provider || !wallet.address || !wallet.chainId) return;
    try {
      setErr(null);
      setAuthStatus("loading");
      const nonceRes = await getNonce(wallet.address, wallet.chainId);
      const s = await signLoginMessage(wallet.provider, wallet.address, nonceRes.message);
      setSig(s);
      await verify(wallet.address, wallet.chainId, nonceRes.nonce, s);
      await wallet.refreshMe();
      setAuthStatus("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign failed");
      setAuthStatus("idle");
    }
  }

  useEffect(() => {
    if (wallet.status !== "connected") return;
    refreshBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.status, wallet.address, wallet.chainId]);

  return (
    <PageShell
      title="Wallet"
      subtitle={
        isCex
          ? "CEX Full: custodial + non-custodial balances, deposit/withdraw, internal transfers."
          : "DEX Lite: non-custodial only (connect wallet, swap-ready)."
      }
    >
      {/* DEX stays minimal; CEX uses responsive dashboard panels */}
      {!isCex ? (
        <Grid>
          <Span col={7}>
            <Card title="Portfolio overview" right={<Pill tone="info">Web3</Pill>}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Total (USD)</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>—</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Connected wallet</div>
                    <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700 }}>
                      {wallet.status === "connected" && wallet.address ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "Not connected"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <Button onClick={() => wallet.connect()}>
                    {wallet.status === "connected" ? "Wallet connected" : "Connect wallet (RainbowKit)"}
                  </Button>
                  {wallet.status === "connected" ? (
                    <Button variant="secondary" onClick={() => void wallet.disconnect()}>
                      Disconnect
                    </Button>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, opacity: 0.72 }}>
                  Network: <span style={{ opacity: 0.95 }}>{chainName(wallet.chainId)}</span>
                </div>
              </div>
            </Card>
          </Span>

          <Span col={5}>
            <Card title="Balances">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                  Native: {wallet.status === "connected" ? nativeBal : "—"}
                </div>
                {presets.map((t) => (
                  <div key={t.symbol} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                    {t.symbol}: {tokenBalances[t.symbol] ? formatUnitsHex(tokenBalances[t.symbol], t.decimals) : "—"}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button variant="secondary" onClick={refreshBalances}>
                    Refresh
                  </Button>
                </div>
              </div>
            </Card>
          </Span>

          <Span col={12}>
            <Card title="Sign message (login)" tone="info" right={<Pill>Auth</Pill>}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                  This will be used for the Phase‑1 user system (wallet‑signature login).
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Session:{" "}
                  <span style={{ opacity: 0.95 }}>
                    {wallet.user ? `Logged in as ${String(wallet.user.address).slice(0, 6)}…${String(wallet.user.address).slice(-4)}` : "Not logged in"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button onClick={doSign}>{authStatus === "loading" ? "Signing..." : "Sign & Login"}</Button>
                  {sig ? (
                    <Button variant="secondary" onClick={() => navigator.clipboard.writeText(sig)}>
                      Copy signature
                    </Button>
                  ) : null}
                  {wallet.user ? (
                    <Button variant="secondary" onClick={() => wallet.logout()}>
                      Logout
                    </Button>
                  ) : null}
                </div>
                {sig ? (
                  <div style={{ fontSize: 12, opacity: 0.8, wordBreak: "break-all" }}>{sig}</div>
                ) : null}
                {err ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>Error: {err}</div> : null}
              </div>
            </Card>
          </Span>

          <Span col={12}>
            <Card title="DEX mode note" tone="info">
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                Custodial features (deposit/withdraw/transfer) are disabled in DEX Lite mode.
              </div>
            </Card>
          </Span>
        </Grid>
      ) : (
        <ResponsivePanels
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "balances", label: "Balances" },
            { id: "custodial", label: "Custodial" },
            { id: "staking", label: "Staking" }
          ] as const}
          renderMobile={(active) => (
            <Grid columns={12} gap={12}>
              <Span col={12}>
                {active === "overview" ? (
                  <Card title="Portfolio overview" right={<Pill tone="info">Custodial + Web3</Pill>}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>Total (USD)</div>
                          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>—</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>Connected wallet</div>
                          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700 }}>Not connected</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Button>Connect Wallet</Button>
                        <Button variant="secondary">Manage Custodial Account</Button>
                      </div>
                    </div>
                  </Card>
                ) : null}

                {active === "balances" ? (
                  <Card title="Balances">
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>ETH: —</div>
                      <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>USDT: —</div>
                      <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>LDX: —</div>
                    </div>
                  </Card>
                ) : null}

                {active === "custodial" ? (
                  <Card title="Custodial actions" right={<Pill tone="success">CEX</Pill>}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <Button>Deposit</Button>
                      <Button variant="secondary">Withdraw</Button>
                      <Button variant="secondary">Transfer DEX ⇄ CEX</Button>
                      <div style={{ fontSize: 12, opacity: 0.72 }}>Custodial wallet flows (deposit/withdraw/transfer).</div>
                    </div>
                  </Card>
                ) : null}

                {active === "staking" ? (
                  <Card title="Staking overview (CEX)">
                    <div style={{ padding: 12, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.18)", display: "grid", placeItems: "center", height: 160, opacity: 0.75 }}>
                      Active stakes / rewards placeholder
                    </div>
                  </Card>
                ) : null}
              </Span>
            </Grid>
          )}
        >
          <Grid>
            <Span col={5}>
              <Card title="Portfolio overview" right={<Pill tone="info">Custodial + Web3</Pill>}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Total (USD)</div>
                      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>—</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Connected wallet</div>
                      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700 }}>Not connected</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button>Connect Wallet</Button>
                    <Button variant="secondary">Manage Custodial Account</Button>
                  </div>
                </div>
              </Card>
              <div style={{ marginTop: 12 }}>
                <Card title="Custodial actions" right={<Pill tone="success">CEX</Pill>}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <Button>Deposit</Button>
                    <Button variant="secondary">Withdraw</Button>
                    <Button variant="secondary">Transfer DEX ⇄ CEX</Button>
                    <div style={{ fontSize: 12, opacity: 0.72 }}>Custodial wallet flows (deposit/withdraw/transfer).</div>
                  </div>
                </Card>
              </div>
            </Span>

            <Span col={7}>
              <Card title="Balances">
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>ETH: —</div>
                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>USDT: —</div>
                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>LDX: —</div>
                </div>
              </Card>
              <div style={{ marginTop: 12 }}>
                <Card title="Staking overview (CEX)">
                  <div style={{ padding: 12, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.18)", display: "grid", placeItems: "center", height: 160, opacity: 0.75 }}>
                    Active stakes / rewards placeholder
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

