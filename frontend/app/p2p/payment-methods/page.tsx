"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "../../../components/ui";
import { apiDelete, apiGet, apiPost } from "../../../services/api";
import { me } from "../../../wallet/auth";

type Method = {
  id: string;
  type: string;
  label: string;
  accountName: string;
  accountValue: string;
  instructions: string | null;
};

export default function P2PPaymentMethodsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("mobile_money");
  const [label, setLabel] = useState("MTN Mobile Money");
  const [accountName, setAccountName] = useState("");
  const [accountValue, setAccountValue] = useState("");
  const [instructions, setInstructions] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const m = await me();
      const uid = m.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setMethods([]);
        return;
      }
      const r = await apiGet<{ ok: true; methods: Method[] }>("/v1/p2p/payment-methods");
      setMethods(r.methods || []);
    } catch {
      setMethods([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    setMsg(null);
    if (!userId) return;
    try {
      await apiPost("/v1/p2p/payment-methods", {
        type,
        label,
        accountName,
        accountValue,
        instructions: instructions || undefined
      });
      setShowForm(false);
      setAccountName("");
      setAccountValue("");
      setInstructions("");
      setMsg("Saved.");
      void refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  }

  async function del(id: string) {
    if (!window.confirm("Remove this payment method?")) return;
    try {
      await apiDelete(`/v1/p2p/payment-methods/${encodeURIComponent(id)}`);
      void refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/p2p" className="text-sm text-[#7aa7ff] hover:underline">
          ← P2P home
        </Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0B0F1A] p-5 shadow-xl">
        <h1 className="text-lg font-semibold text-white">Payment methods</h1>
        <p className="mt-1 text-sm text-gray-400">Saved instructions shown only to you and trade counterparties during orders.</p>

        {!userId ? (
          <p className="mt-4 text-sm text-white/70">
            <Link className="text-[#7aa7ff] underline" href="/wallet">
              Sign in
            </Link>{" "}
            to manage payment methods.
          </p>
        ) : (
          <>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setShowForm((s) => !s)}>
                {showForm ? "Close form" : "+ Add new payment"}
              </Button>
            </div>

            {showForm ? (
              <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-white/50">Payment type</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="mobile_money">Mobile Money</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50">Label</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50">Account name</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50">Phone / account number</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    value={accountValue}
                    onChange={(e) => setAccountValue(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-white/50">Instructions</label>
                  <textarea
                    className="mt-1 min-h-[72px] w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Send payment and click paid…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button onClick={() => void save()}>Save</Button>
                </div>
              </div>
            ) : null}

            {msg ? <p className="mt-3 text-sm text-[#b8f5e0]">{msg}</p> : null}

            <div className="mt-6 space-y-3">
              {methods.length === 0 ? (
                <p className="text-sm text-white/55">No saved methods.</p>
              ) : (
                methods.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <div className="font-semibold text-white">{m.label}</div>
                      <div className="text-xs text-white/65">
                        {m.accountName} · {m.accountValue}
                      </div>
                      {m.instructions ? <div className="mt-1 text-xs text-white/50">{m.instructions}</div> : null}
                    </div>
                    <Button variant="danger" className="!text-xs" onClick={() => void del(m.id)}>
                      Delete
                    </Button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
