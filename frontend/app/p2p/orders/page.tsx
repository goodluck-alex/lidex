"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../../services/api";
import { me } from "../../../wallet/auth";

type Row = {
  id: string;
  status: string;
  fiatAmount: string;
  tokenAmount: string;
  price: string;
  tokenSymbol: string;
  fiatCurrency: string;
  role: string;
  expiresAt: string;
};

export default function P2POrdersListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const m = await me();
      setUserId(m.user?.id ?? null);
      if (!m.user?.id) {
        setRows([]);
        return;
      }
      const r = await apiGet<{ ok: true; orders: Row[] }>("/v1/p2p/orders");
      setRows(r.orders || []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Link href="/p2p" className="text-sm text-[#7aa7ff] hover:underline">
          ← P2P home
        </Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0B0F1A] p-5 shadow-xl">
        <h1 className="text-lg font-semibold text-white">My orders</h1>
        {!userId ? (
          <p className="mt-3 text-sm text-white/70">
            <Link className="underline text-[#7aa7ff]" href="/wallet">
              Sign in
            </Link>{" "}
            to see orders.
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-white/60">No orders yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {rows.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <span className="text-white/90">{o.status}</span>
                  <span className="ml-2 text-white/55">
                    {o.role} · {o.fiatAmount} {o.fiatCurrency} → {o.tokenAmount} {o.tokenSymbol}
                  </span>
                </div>
                <Link className="text-[#7aa7ff] hover:underline" href={`/p2p/order/${o.id}`}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
