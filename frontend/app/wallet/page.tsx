"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useMode } from "../../context/mode";
import { Button, Card, Grid, PageShell, Pill, Span } from "../../components/ui";
import { ResponsivePanels } from "../../components/ResponsivePanels";
import { useWallet } from "../../wallet/useWallet";
import { TOKENS, type ChainId } from "../../utils/tokens";
import { getNativeBalance, getErc20Balance } from "../../wallet/balance";
import { chainName } from "../../utils/chains";
import { getNonce, signLoginMessage, verify } from "../../wallet/auth";
import { apiGet } from "../../services/api";
import { CexCustodialCard } from "./CexCustodialCard";

type CexBalancesResponse = {
  ok: true;
  base: string;
  quote: string;
  balances: Record<string, { available: string; locked: string }>;
};

export default function WalletPage() {
  const { mode } = useMode();
  const isCex = mode === "cex";
  const wallet = useWallet();

  const [nativeBal, setNativeBal] = useState<string>("—");
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "done">("idle");
  const [cexBal, setCexBal] = useState<CexBalancesResponse | null>(null);
  const [cexBalErr, setCexBalErr] = useState<string | null>(null);

  const chainId = (wallet.chainId || 56) as ChainId;
  const presets = useMemo(() => TOKENS[chainId] || [], [chainId]);
  const cexAssets = useMemo(() => {
    const b = cexBal?.base;
    const q = cexBal?.quote;
    if (!b || !q) return [];
    return [b, q].filter((a, i, arr) => arr.indexOf(a) === i);
  }, [cexBal]);

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

  const loadCexBalances = useCallback(async () => {
    if (!wallet.user) {
      setCexBal(null);
      setCexBalErr(null);
      return;
    }
    try {
      setCexBalErr(null);
      const r = await apiGet<CexBalancesResponse>("/v1/cex/balances");
      setCexBal(r);
    } catch (e) {
      setCexBal(null);
      setCexBalErr(e instanceof Error ? e.message : "Could not load CEX balances");
    }
  }, [wallet.user]);

  useEffect(() => {
    if (wallet.status !== "connected") return;
    refreshBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.status, wallet.address, wallet.chainId]);

  useEffect(() => {
    if (!isCex) return;
    void loadCexBalances();
  }, [isCex, loadCexBalances, wallet.user]);

  async function refreshAllBalances() {
    await refreshBalances();
    await loadCexBalances();
  }

  const signInCard = (
    <Card title="Sign message (login)" tone="info" right={<Pill>Auth</Pill>}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
          Wallet-signature session is required for custodial balances, trading, and on-chain deposit/withdraw.
        </div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Session:{" "}
          <span style={{ opacity: 0.95 }}>
            {wallet.user
              ? `Logged in as ${String(wallet.user.address).slice(0, 6)}…${String(wallet.user.address).slice(-4)}`
              : "Not logged in"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={() => void doSign()}>{authStatus === "loading" ? "Signing..." : "Sign & Login"}</Button>
          {sig ? (
            <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(sig)}>
              Copy signature
            </Button>
          ) : null}
          {wallet.user ? (
            <Button variant="secondary" onClick={() => void wallet.logout()}>
              Logout
            </Button>
          ) : null}
        </div>
        {sig ? <div style={{ fontSize: 12, opacity: 0.8, wordBreak: "break-all" }}>{sig}</div> : null}
        {err ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>Error: {err}</div> : null}
      </div>
    </Card>
  );

  const cexPortfolioCard = (
    <Card title="Portfolio overview" right={<Pill tone="info">Custodial + Web3</Pill>}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Total (USD)</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>—</div>
          </div>
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Connected wallet</div>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700 }}>
              {wallet.status === "connected" && wallet.address
                ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
                : "Not connected"}
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
        <div style={{ fontSize: 11, opacity: 0.68, lineHeight: 1.45 }}>
          On-chain deposit and withdraw: use the <b>Custodial</b> panel below (wide layout) or the <b>Custodial</b> tab on mobile.
        </div>
      </div>
    </Card>
  );

  const cexBalancesCard = (
    <Card title="Balances">
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 8 }}>Wallet (on-chain)</div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
              Native: {wallet.status === "connected" ? nativeBal : "—"}
            </div>
            {presets.map((t) => (
              <div key={t.symbol} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                {t.symbol}: {tokenBalances[t.symbol] ? formatUnitsHex(tokenBalances[t.symbol], t.decimals) : "—"}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 8 }}>CEX account (cust)</div>
          {!wallet.user ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>Sign in to load custodial balances.</div>
          ) : cexBalErr ? (
            <div style={{ fontSize: 12, color: "#ff8a8a" }}>{cexBalErr}</div>
          ) : cexBal ? (
            <div style={{ display: "grid", gap: 10 }}>
              {cexAssets.map((asset) => {
                const row = cexBal.balances[asset] || { available: "0", locked: "0" };
                return (
                  <div key={asset} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
                    <span style={{ fontWeight: 600 }}>{asset}</span>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                      Available: {row.available} · Locked: {row.locked}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.75 }}>Loading…</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => void refreshAllBalances()}>
            Refresh all
          </Button>
        </div>
      </div>
    </Card>
  );

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
                  <div style={{ display: "grid", gap: 12 }}>
                    {cexPortfolioCard}
                    {signInCard}
                  </div>
                ) : null}

                {active === "balances" ? cexBalancesCard : null}

                {active === "custodial" ? <CexCustodialCard /> : null}

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
              {cexPortfolioCard}
              <div style={{ marginTop: 12 }}>
                <CexCustodialCard />
              </div>
              <div style={{ marginTop: 12 }}>{signInCard}</div>
            </Span>

            <Span col={7}>
              {cexBalancesCard}
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

