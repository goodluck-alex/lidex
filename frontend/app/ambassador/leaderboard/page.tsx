"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AmbassadorLeaderboard, type LeaderRow } from "../../../components/ambassador/AmbassadorLeaderboard";
import { apiGet } from "../../../services/api";

export default function AmbassadorLeaderboardPage() {
  const [monthKey, setMonthKey] = useState("");
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<{ ok: true; monthKey: string; rows: LeaderRow[] }>("/v1/ambassador/leaderboard");
        if (cancelled) return;
        setMonthKey(data.monthKey);
        setRows(data.rows);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <Link href="/ambassador" className="text-sm font-semibold text-[#2979ff] hover:underline">
        ← Program home
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white">Leaderboard</h1>
      {err ? <p className="mt-4 text-sm text-red-300">{err}</p> : null}
      <div className="mt-6">
        <AmbassadorLeaderboard monthKey={monthKey} rows={rows} />
      </div>
    </main>
  );
}
