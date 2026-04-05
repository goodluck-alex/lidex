"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "../../../../components/ui";
import { apiGet, apiPost } from "../../../../services/api";

type OrderDetail = {
  id: string;
  status: string;
  fiatAmount: string;
  tokenAmount: string;
  price: string;
  expiresAt: string;
  createdAt: string;
  role: "buyer" | "seller";
  buyerLabel: string;
  sellerLabel: string;
  ad: {
    paymentMethodLabel: string;
    terms: string | null;
    timeLimitMinutes: number;
    tokenSymbol: string;
    fiatCurrency: string;
  };
};

type ChatLine = { id: string; body: string; createdAt: string; fromLabel: string; mine: boolean };

function fmtRemaining(expiresAt: string, status: string) {
  if (["completed", "cancelled", "expired"].includes(status)) return null;
  const end = new Date(expiresAt).getTime();
  const ms = end - Date.now();
  if (ms <= 0) return "0:00";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function P2POrderPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await apiGet<{ ok: true; order: OrderDetail }>(`/v1/p2p/orders/${encodeURIComponent(id)}`);
      setOrder(r.order);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load order");
      setOrder(null);
    }
  }, [id]);

  const loadChat = useCallback(async () => {
    if (!id) return;
    try {
      const r = await apiGet<{ ok: true; messages: ChatLine[] }>(`/v1/p2p/orders/${encodeURIComponent(id)}/messages`);
      setMessages(r.messages || []);
    } catch {
      setMessages([]);
    }
  }, [id]);

  useEffect(() => {
    void load();
    void loadChat();
  }, [load, loadChat]);

  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  async function sendChat() {
    const text = draft.trim();
    if (!text || !id) return;
    setBusy(true);
    try {
      await apiPost(`/v1/p2p/orders/${encodeURIComponent(id)}/messages`, { body: text });
      setDraft("");
      void loadChat();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function markPaid() {
    if (!id) return;
    setBusy(true);
    try {
      await apiPost(`/v1/p2p/orders/${encodeURIComponent(id)}/paid`, {});
      void load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRelease() {
    if (!id) return;
    setBusy(true);
    try {
      await apiPost(`/v1/p2p/orders/${encodeURIComponent(id)}/confirm`, {});
      void load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!id || !window.confirm("Cancel this order?")) return;
    setBusy(true);
    try {
      await apiPost(`/v1/p2p/orders/${encodeURIComponent(id)}/cancel`, {});
      void load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const timer = order ? fmtRemaining(order.expiresAt, order.status) : null;
  void tick;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link href="/p2p?tab=trading" className="text-sm text-[#7aa7ff] hover:underline">
          ← Back to P2P
        </Link>
      </div>

      {err ? <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div> : null}

      {order ? (
        <div className="rounded-2xl border border-white/10 bg-[#0B0F1A] p-5 shadow-xl">
          <h1 className="text-lg font-semibold text-white">Order</h1>
          <p className="mt-1 text-xs text-gray-400">You are the {order.role}. Pay off-platform using the seller&apos;s instructions; chat stays on Lidex.</p>

          <div className="mt-4 space-y-2 text-sm text-white/85">
            <div>
              Seller: <span className="text-white">{order.sellerLabel}</span>
            </div>
            <div>
              Buyer: <span className="text-white">{order.buyerLabel}</span>
            </div>
            <div>
              Price:{" "}
              <span className="text-white">
                {order.price} {order.ad.fiatCurrency}/{order.ad.tokenSymbol}
              </span>
            </div>
            <div>
              Fiat amount:{" "}
              <span className="text-white">
                {order.fiatAmount} {order.ad.fiatCurrency}
              </span>
            </div>
            <div>
              Token amount:{" "}
              <span className="text-white">
                {order.tokenAmount} {order.ad.tokenSymbol}
              </span>
            </div>
            <div>Payment: {order.ad.paymentMethodLabel}</div>
            <div>Status: {order.status}</div>
            {timer != null ? (
              <div className="font-mono text-[#f0b90b]">
                Timer: {timer} {order.status === "expired" ? "(expired)" : ""}
              </div>
            ) : null}
            {order.ad.terms ? <div className="text-xs text-white/60">Terms: {order.ad.terms}</div> : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {order.role === "buyer" && order.status === "awaiting_payment" ? (
              <Button onClick={() => void markPaid()} disabled={busy}>
                Mark as paid
              </Button>
            ) : null}
            {order.role === "seller" && order.status === "buyer_paid" ? (
              <Button onClick={() => void confirmRelease()} disabled={busy}>
                Confirm release
              </Button>
            ) : null}
            {["awaiting_payment", "buyer_paid"].includes(order.status) ? (
              <Button variant="secondary" onClick={() => void cancel()} disabled={busy}>
                Cancel
              </Button>
            ) : null}
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <h2 className="text-sm font-semibold text-white">Chat</h2>
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
              {messages.length === 0 ? <div className="text-white/50">No messages yet.</div> : null}
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col gap-0.5 ${m.mine ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-white/45">{m.fromLabel}</span>
                  <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${m.mine ? "bg-[#00c896]/20 text-[#b8f5e0]" : "bg-white/10 text-white/90"}`}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00c896]/40"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message counterparty…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendChat();
                  }
                }}
              />
              <Button variant="secondary" onClick={() => void sendChat()} disabled={busy}>
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : !err ? (
        <div className="text-sm text-white/60">Loading…</div>
      ) : null}
    </div>
  );
}
