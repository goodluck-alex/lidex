"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Pill } from "../../components/ui";
import { apiGet, apiPost } from "../../services/api";
import { buildCexWithdrawAuthMessage } from "../../utils/cexWithdrawAuth";
import { signLoginMessage } from "../../wallet/auth";
import { useWallet } from "../../wallet/useWallet";

type OnchainConfig = {
  enabled: boolean;
  configured?: boolean;
  chainId?: number | null;
  depositAddress?: string | null;
  minConfirmations?: number;
  assets?: { asset: string; tokenAddress: string; decimals: number }[];
  withdrawEnabled?: boolean;
  withdrawCustomAddressEnabled?: boolean;
  depositPollerEnabled?: boolean;
  treasurySnapshotAvailable?: boolean;
  /** Etherscan-style origin, no trailing slash (e.g. https://bscscan.com). */
  explorerBaseUrl?: string | null;
};

type TreasurySnapshot = {
  ok: true;
  chainId: number;
  deposit: { address: string; native: string; tokens: { asset: string; balance: string | null; error?: string }[] };
  hotWallet: { address: string; native: string; tokens: { asset: string; balance: string | null; error?: string }[] } | null;
  warnings: { code: string; detail: string }[];
};

type WithdrawChallenge = {
  ok: true;
  nonce: string;
  expiresAtUnix: number;
  chainId: number;
  fromAddress: string;
};

type CexConfigResponse = {
  ok: true;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  onchain: OnchainConfig;
};

type WithdrawRow = {
  id: string;
  asset: string;
  amount: string;
  toAddress: string;
  status: string;
  txHash: string | null;
  failReason: string | null;
  createdAt: string;
};

type OnchainDepositRow = {
  id: string;
  chainId: number;
  txHash: string;
  logIndex: number;
  asset: string;
  amount: string;
  createdAt: string;
};

type DepositStatusResponse =
  | { ok: true; found: false }
  | {
      ok: true;
      found: true;
      txHash: string;
      receiptSuccess: boolean;
      blockNumber: number;
      confirmations: number;
      confirmationsRequired: number;
      readyToConfirm: boolean;
      matchingTransfers: { logIndex: number; asset: string; amount: string; credited: boolean }[];
      hasMatchingTransfers: boolean;
      alreadyCredited: { logIndex: number; asset: string; amount: string }[];
      pendingCreditCount: number;
      allCreditedForYou: boolean;
    };

function normalizeTxHash(raw: string) {
  const t = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(t)) return `0x${t}`;
  return t;
}

function exBase(base: string) {
  return base.replace(/\/$/, "");
}

function explorerAddressLink(base: string | null | undefined, address: string) {
  if (!base) return null;
  return `${exBase(base)}/address/${address}`;
}

function explorerTxLink(base: string | null | undefined, txHash: string) {
  if (!base || !txHash) return null;
  return `${exBase(base)}/tx/${txHash}`;
}

function explorerTokenLink(base: string | null | undefined, tokenAddress: string) {
  if (!base) return null;
  return `${exBase(base)}/token/${tokenAddress}`;
}

function formatDepositStatus(s: DepositStatusResponse): string {
  if (!s.found) {
    return "Transaction not found on this chain yet (wrong network or not mined).";
  }
  const lines: string[] = [];
  lines.push(
    `Confirmations: ${s.confirmations} / ${s.confirmationsRequired}${
      s.readyToConfirm ? " — enough to confirm" : " — wait for more blocks"
    }`
  );
  if (!s.receiptSuccess) {
    lines.push("This transaction failed on-chain — it cannot be credited.");
    return lines.join("\n\n");
  }
  if (!s.hasMatchingTransfers) {
    lines.push(
      "No configured token transfer from your signed-in wallet to the CEX deposit address appears in this transaction."
    );
    return lines.join("\n\n");
  }
  lines.push(
    "Matching transfers:\n" +
      s.matchingTransfers.map((m) => `${m.asset} ${m.amount}${m.credited ? " · credited" : " · not credited"}`).join("\n")
  );
  if (s.allCreditedForYou) {
    lines.push("All matching amounts are already in your CEX balance.");
  } else if (s.pendingCreditCount > 0) {
    lines.push(
      s.readyToConfirm
        ? `${s.pendingCreditCount} transfer(s) not credited yet — you can Confirm deposit now.`
        : `${s.pendingCreditCount} transfer(s) not credited yet — wait for confirmations, then Confirm deposit.`
    );
  }
  return lines.join("\n\n");
}

export function CexCustodialCard() {
  const wallet = useWallet();
  const [cfg, setCfg] = useState<CexConfigResponse | null>(null);
  const [cfgErr, setCfgErr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [depBusy, setDepBusy] = useState(false);
  const [depStatusBusy, setDepStatusBusy] = useState(false);
  const [depMsg, setDepMsg] = useState<string | null>(null);
  const [depStatusMsg, setDepStatusMsg] = useState<string | null>(null);
  const [wdAsset, setWdAsset] = useState("");
  const [wdAmt, setWdAmt] = useState("");
  const [wdBusy, setWdBusy] = useState(false);
  const [wdMsg, setWdMsg] = useState<string | null>(null);
  const [wdCustomTo, setWdCustomTo] = useState("");
  const [wdUseCustomRecipient, setWdUseCustomRecipient] = useState(false);
  const [history, setHistory] = useState<WithdrawRow[]>([]);
  const [depositHistory, setDepositHistory] = useState<OnchainDepositRow[]>([]);
  const [treasury, setTreasury] = useState<TreasurySnapshot | null>(null);
  const [treasuryErr, setTreasuryErr] = useState<string | null>(null);
  const [treasuryBusy, setTreasuryBusy] = useState(false);

  const loadCfg = useCallback(async () => {
    try {
      setCfgErr(null);
      const c = await apiGet<CexConfigResponse>("/v1/cex/config");
      setCfg(c);
      const assets = c.onchain?.assets || [];
      setWdAsset((prev) => prev || assets[0]?.asset || "");
    } catch (e) {
      setCfg(null);
      setCfgErr(e instanceof Error ? e.message : "Failed to load CEX config");
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!wallet.user) return;
    try {
      const r = await apiGet<{ ok: true; withdrawals: WithdrawRow[] }>("/v1/cex/onchain/withdrawals?limit=15");
      setHistory(r.withdrawals || []);
    } catch {
      setHistory([]);
    }
  }, [wallet.user]);

  const loadDepositHistory = useCallback(async () => {
    if (!wallet.user) return;
    try {
      const r = await apiGet<{ ok: true; deposits: OnchainDepositRow[] }>("/v1/cex/onchain/deposits?limit=15");
      setDepositHistory(r.deposits || []);
    } catch {
      setDepositHistory([]);
    }
  }, [wallet.user]);

  const loadTreasury = useCallback(async () => {
    if (!wallet.user) return;
    setTreasuryBusy(true);
    setTreasuryErr(null);
    try {
      const r = await apiGet<TreasurySnapshot>("/v1/cex/onchain/treasury");
      setTreasury(r);
    } catch (e) {
      setTreasury(null);
      setTreasuryErr(e instanceof Error ? e.message : "Treasury snapshot failed");
    } finally {
      setTreasuryBusy(false);
    }
  }, [wallet.user]);

  useEffect(() => {
    void loadCfg();
  }, [loadCfg]);

  useEffect(() => {
    void loadHistory();
    void loadDepositHistory();
  }, [loadHistory, loadDepositHistory, wallet.user]);

  const oc = cfg?.onchain;

  async function checkDepositStatus() {
    setDepStatusMsg(null);
    if (!wallet.user) {
      setDepStatusMsg("Sign in with your wallet first (Sign & Login).");
      return;
    }
    const h = normalizeTxHash(txHash);
    if (!/^0x[0-9a-fA-F]{64}$/.test(h)) {
      setDepStatusMsg("Enter a valid transaction hash (0x…).");
      return;
    }
    setDepStatusBusy(true);
    try {
      const s = await apiGet<DepositStatusResponse>(
        `/v1/cex/onchain/deposit/status?txHash=${encodeURIComponent(h)}`
      );
      setDepStatusMsg(formatDepositStatus(s));
    } catch (e) {
      setDepStatusMsg(e instanceof Error ? e.message : "Status check failed");
    } finally {
      setDepStatusBusy(false);
    }
  }

  async function confirmDeposit() {
    setDepMsg(null);
    if (!wallet.user) {
      setDepMsg("Sign in with your wallet first (Sign & Login).");
      return;
    }
    const h = normalizeTxHash(txHash);
    if (!/^0x[0-9a-fA-F]{64}$/.test(h)) {
      setDepMsg("Enter a valid transaction hash (0x…).");
      return;
    }
    setDepBusy(true);
    try {
      const r = await apiPost<{
        ok: true;
        credited: string[];
        skipped: string[];
        confirmations: number;
      }>("/v1/cex/onchain/deposit/confirm", { txHash: h });
      const parts = [];
      if (r.credited?.length) parts.push(`Credited: ${r.credited.join(", ")}`);
      if (r.skipped?.length) parts.push(`Already processed: ${r.skipped.join(", ")}`);
      setDepMsg(parts.join(" · ") || "Done.");
      setTxHash("");
      void loadDepositHistory();
    } catch (e) {
      setDepMsg(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setDepBusy(false);
    }
  }

  async function doWithdraw() {
    setWdMsg(null);
    if (!wallet.user) {
      setWdMsg("Sign in first.");
      return;
    }
    if (!wdAsset || !wdAmt.trim()) {
      setWdMsg("Choose asset and amount.");
      return;
    }
    const custom = wdCustomTo.trim();
    if (wdUseCustomRecipient) {
      if (!custom.startsWith("0x") || custom.length < 42) {
        setWdMsg("Enter a valid 0x recipient address.");
        return;
      }
      if (!wallet.provider || !wallet.address) {
        setWdMsg("Connect your wallet to sign the withdraw authorization.");
        return;
      }
      let ch: WithdrawChallenge;
      let msg: string;
      try {
        ch = await apiGet<WithdrawChallenge>("/v1/cex/onchain/withdraw/challenge");
        msg = buildCexWithdrawAuthMessage({
          fromAddress: ch.fromAddress,
          toAddress: custom,
          asset: wdAsset,
          amount: wdAmt.trim(),
          chainId: ch.chainId,
          expiryUnix: ch.expiresAtUnix,
          nonce: ch.nonce,
        });
      } catch (e) {
        setWdMsg(e instanceof Error ? e.message : "Could not get withdraw challenge");
        return;
      }
      setWdBusy(true);
      try {
        const signature = await signLoginMessage(wallet.provider, wallet.address, msg);
        const r = await apiPost<{ ok: true; txHash: string }>("/v1/cex/onchain/withdraw/signed", {
          asset: wdAsset,
          amount: wdAmt.trim(),
          toAddress: custom,
          message: msg,
          signature,
          withdrawNonce: ch.nonce,
        });
        setWdMsg(`Sent on-chain · ${r.txHash.slice(0, 10)}…`);
        setWdAmt("");
        void loadHistory();
      } catch (e) {
        setWdMsg(e instanceof Error ? e.message : "Withdraw failed");
      } finally {
        setWdBusy(false);
      }
      return;
    }

    setWdBusy(true);
    try {
      const r = await apiPost<{ ok: true; txHash: string; amount: string; asset: string }>("/v1/cex/onchain/withdraw", {
        asset: wdAsset,
        amount: wdAmt.trim(),
      });
      setWdMsg(`Sent on-chain · ${r.txHash.slice(0, 10)}…`);
      setWdAmt("");
      void loadHistory();
    } catch (e) {
      setWdMsg(e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setWdBusy(false);
    }
  }

  const chainMismatch =
    oc?.chainId != null && wallet.chainId != null && Number(wallet.chainId) !== Number(oc.chainId);

  return (
    <Card title="On-chain deposit / withdraw" right={<Pill tone="success">CEX</Pill>}>
      <div style={{ display: "grid", gap: 12 }}>
        {cfgErr ? <div style={{ fontSize: 13, color: "#ff8a8a" }}>{cfgErr}</div> : null}

        {!cfg ? (
          !cfgErr ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>Loading…</div>
          ) : null
        ) : !oc?.enabled ? (
          <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.5 }}>
            On-chain bridging is off. Enable <code style={{ fontSize: 12 }}>CEX_ONCHAIN_ENABLED</code> on the API and set RPC, deposit
            address, and token contracts. Paper credits remain available if <code style={{ fontSize: 12 }}>CEX_PAPER_TRANSFERS</code> is on.
          </div>
        ) : !oc.configured ? (
          <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.5 }}>
            On-chain mode is enabled but not fully configured (check <code style={{ fontSize: 12 }}>CEX_ONCHAIN_RPC_URL</code>,{" "}
            <code style={{ fontSize: 12 }}>CEX_DEPOSIT_ADDRESS</code>, and <code style={{ fontSize: 12 }}>CEX_TOKEN_*_ADDRESS</code> per pair
            asset).
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, opacity: 0.78, lineHeight: 1.5 }}>
              <div>
                <b>Network</b> · chainId {oc.chainId} · min confirmations {oc.minConfirmations ?? "—"}
              </div>
              <div style={{ marginTop: 6 }}>
                <b>Deposit address</b> (send ERC-20 from your logged-in wallet only)
              </div>
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    flex: "1 1 200px",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 11,
                    wordBreak: "break-all",
                  }}
                >
                  {oc.depositAddress && explorerAddressLink(oc.explorerBaseUrl, oc.depositAddress) ? (
                    <a
                      href={explorerAddressLink(oc.explorerBaseUrl, oc.depositAddress)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
                    >
                      {oc.depositAddress}
                    </a>
                  ) : (
                    oc.depositAddress
                  )}
                </div>
                {oc.depositAddress ? (
                  <Button
                    variant="secondary"
                    style={{ fontSize: 11, padding: "6px 10px" }}
                    onClick={() => void navigator.clipboard.writeText(oc.depositAddress!)}
                  >
                    Copy
                  </Button>
                ) : null}
              </div>
              {oc.assets?.length ? (
                <div style={{ marginTop: 8, opacity: 0.85 }}>
                  Supported:{" "}
                  {oc.assets.map((a) => {
                    const tHref = explorerTokenLink(oc.explorerBaseUrl, a.tokenAddress);
                    return (
                      <span key={a.asset} style={{ marginRight: 8 }}>
                        {a.asset} →{" "}
                        {tHref ? (
                          <a
                            href={tHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "inherit", opacity: 0.85, textDecoration: "underline", textUnderlineOffset: 2 }}
                          >
                            {a.tokenAddress.slice(0, 10)}…
                          </a>
                        ) : (
                          <span style={{ opacity: 0.7 }}>{a.tokenAddress.slice(0, 10)}…</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : null}
              {oc.depositPollerEnabled ? (
                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.72, lineHeight: 1.45 }}>
                  Deposits are <b>auto-detected</b> after enough confirmations (no hash required). Use the field below only if you want to
                  trigger a credit immediately.
                </div>
              ) : null}
            </div>

            {chainMismatch ? (
              <div style={{ fontSize: 12, color: "#ffb86b" }}>
                Your wallet network ({wallet.chainId}) does not match CEX chain ({oc.chainId}). Switch network before sending tokens.
              </div>
            ) : null}

            {!wallet.user ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>Sign in on this page so deposits are credited to your account.</div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, opacity: 0.75 }}>
                    {oc.depositPollerEnabled
                      ? "Optional — paste tx hash to credit without waiting for the poller"
                      : "After you send tokens, paste the tx hash"}
                  </label>
                  <input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x…"
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.25)",
                      color: "inherit",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Button disabled={depStatusBusy || depBusy} onClick={() => void checkDepositStatus()}>
                      {depStatusBusy ? "Checking…" : "Check status"}
                    </Button>
                    <Button disabled={depBusy || depStatusBusy} onClick={() => void confirmDeposit()}>
                      {depBusy ? "Confirming…" : "Confirm deposit"}
                    </Button>
                  </div>
                  {depStatusMsg ? (
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.88,
                        lineHeight: 1.5,
                        whiteSpace: "pre-line",
                        padding: "6px 0 0",
                      }}
                    >
                      {depStatusMsg}
                    </div>
                  ) : null}
                  {depMsg ? (
                    <div style={{ fontSize: 11, opacity: 0.88, lineHeight: 1.45, paddingTop: depStatusMsg ? 4 : 0 }}>
                      {depMsg}
                    </div>
                  ) : null}
                  {oc.explorerBaseUrl && /^0x[0-9a-fA-F]{64}$/.test(normalizeTxHash(txHash)) ? (
                    <a
                      href={explorerTxLink(oc.explorerBaseUrl, normalizeTxHash(txHash))!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, opacity: 0.8 }}
                    >
                      View tx on explorer
                    </a>
                  ) : null}
                </div>

                {oc.withdrawEnabled ? (
                  <div style={{ display: "grid", gap: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>Withdraw</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      Default recipient: your signed-in wallet{" "}
                      {wallet.address ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "—"}
                    </div>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={wdUseCustomRecipient}
                        onChange={(e) => setWdUseCustomRecipient(e.target.checked)}
                      />
                      Send to a different address (wallet signature required)
                    </label>
                    {wdUseCustomRecipient ? (
                      <input
                        value={wdCustomTo}
                        onChange={(e) => setWdCustomTo(e.target.value)}
                        placeholder="0x recipient address"
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(0,0,0,0.25)",
                          color: "inherit",
                          fontFamily: "ui-monospace, monospace",
                          fontSize: 12,
                        }}
                      />
                    ) : null}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <select
                        value={wdAsset}
                        onChange={(e) => setWdAsset(e.target.value)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(0,0,0,0.25)",
                          color: "inherit",
                          fontSize: 12,
                        }}
                      >
                        {(oc.assets || []).map((a) => (
                          <option key={a.asset} value={a.asset}>
                            {a.asset}
                          </option>
                        ))}
                      </select>
                      <input
                        value={wdAmt}
                        onChange={(e) => setWdAmt(e.target.value)}
                        placeholder="Amount"
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(0,0,0,0.25)",
                          color: "inherit",
                          fontSize: 12,
                          width: 140,
                        }}
                      />
                      <Button variant="secondary" disabled={wdBusy} onClick={() => void doWithdraw()}>
                        {wdBusy ? "Sending…" : wdUseCustomRecipient ? "Sign & withdraw" : "Withdraw"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, opacity: 0.65 }}>
                    On-chain withdraw is disabled until the API sets <code style={{ fontSize: 10 }}>CEX_HOT_WALLET_PRIVATE_KEY</code> (fund
                    that wallet with tokens + gas).
                  </div>
                )}
              </>
            )}

            {wdMsg ? <div style={{ fontSize: 12, opacity: 0.85 }}>{wdMsg}</div> : null}

            {depositHistory.length > 0 ? (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Recent on-chain deposits</div>
                <div style={{ maxHeight: 140, overflow: "auto", fontSize: 11, fontFamily: "ui-monospace, monospace", opacity: 0.88 }}>
                  {depositHistory.map((d) => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span>
                        {d.asset} {d.amount}
                        {oc.explorerBaseUrl ? (
                          <>
                            {" · "}
                            <a
                              href={explorerTxLink(oc.explorerBaseUrl, d.txHash)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
                            >
                              {d.txHash.slice(0, 10)}…
                            </a>
                          </>
                        ) : (
                          ` · ${d.txHash.slice(0, 10)}…`
                        )}
                        <span style={{ opacity: 0.65 }}> · log {d.logIndex}</span>
                      </span>
                      <span style={{ opacity: 0.55 }}>{new Date(d.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {history.length > 0 ? (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Recent withdrawals</div>
                <div style={{ maxHeight: 140, overflow: "auto", fontSize: 11, fontFamily: "ui-monospace, monospace", opacity: 0.88 }}>
                  {history.map((w) => (
                    <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span>
                        {w.asset} {w.amount} · {w.status}
                        {w.txHash && oc.explorerBaseUrl ? (
                          <>
                            {" · "}
                            <a
                              href={explorerTxLink(oc.explorerBaseUrl, w.txHash)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
                            >
                              {w.txHash.slice(0, 10)}…
                            </a>
                          </>
                        ) : w.txHash ? (
                          ` · ${w.txHash.slice(0, 10)}…`
                        ) : null}
                      </span>
                      <span style={{ opacity: 0.55 }}>{new Date(w.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {wallet.user && oc.treasurySnapshotAvailable ? (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700 }}>On-chain wallets (read-only)</div>
                <div style={{ fontSize: 11, opacity: 0.68, lineHeight: 1.45 }}>
                  Native + configured pair tokens on the deposit address and hot wallet (if set). Uses the API RPC — for ops monitoring.
                </div>
                <Button variant="secondary" style={{ fontSize: 11 }} disabled={treasuryBusy} onClick={() => void loadTreasury()}>
                  {treasuryBusy ? "Loading…" : "Refresh chain balances"}
                </Button>
                {treasuryErr ? <div style={{ fontSize: 12, color: "#ff8a8a" }}>{treasuryErr}</div> : null}
                {treasury?.warnings?.length ? (
                  <div style={{ fontSize: 11, color: "#ffb86b", lineHeight: 1.45 }}>
                    {treasury.warnings.map((w) => (
                      <div key={w.code}>{w.detail}</div>
                    ))}
                  </div>
                ) : null}
                {treasury ? (
                  <div style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", opacity: 0.88, lineHeight: 1.5 }}>
                    <div style={{ marginBottom: 6 }}>
                      <b>Deposit</b>{" "}
                      {oc.explorerBaseUrl ? (
                        <a
                          href={explorerAddressLink(oc.explorerBaseUrl, treasury.deposit.address)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
                        >
                          {treasury.deposit.address.slice(0, 10)}…
                        </a>
                      ) : (
                        `${treasury.deposit.address.slice(0, 10)}…`
                      )}
                      <br />
                      Native: {treasury.deposit.native}
                      {treasury.deposit.tokens.map((t) => (
                        <span key={t.asset}>
                          <br />
                          {t.asset}: {t.balance ?? "—"}
                          {t.error ? ` (${t.error})` : ""}
                        </span>
                      ))}
                    </div>
                    {treasury.hotWallet ? (
                      <div>
                        <b>Hot</b>{" "}
                        {oc.explorerBaseUrl ? (
                          <a
                            href={explorerAddressLink(oc.explorerBaseUrl, treasury.hotWallet.address)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
                          >
                            {treasury.hotWallet.address.slice(0, 10)}…
                          </a>
                        ) : (
                          `${treasury.hotWallet.address.slice(0, 10)}…`
                        )}
                        <br />
                        Native: {treasury.hotWallet.native}
                        {treasury.hotWallet.tokens.map((t) => (
                          <span key={t.asset}>
                            <br />
                            {t.asset}: {t.balance ?? "—"}
                            {t.error ? ` (${t.error})` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ opacity: 0.65 }}>Hot wallet not configured (no withdraw key).</div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <Button variant="secondary" style={{ fontSize: 11 }} onClick={() => void loadCfg()}>
              Refresh config
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
