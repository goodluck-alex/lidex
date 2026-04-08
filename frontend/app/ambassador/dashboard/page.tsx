"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AmbassadorAchievements, type AchievementRow } from "../../../components/ambassador/AmbassadorAchievements";
import { AmbassadorProgress } from "../../../components/ambassador/AmbassadorProgress";
import { AmbassadorStats } from "../../../components/ambassador/AmbassadorStats";
import { apiGet } from "../../../services/api";

type MeResponse = {
  ok: true;
  application: { status: string; username: string; createdAt: string } | null;
  profile: {
    publicUsername: string;
    status: string;
    signups: number;
    activeUsers: number;
    traders: number;
    deposits: number;
    totalPoints: number;
    ldxRewarded: string;
  } | null;
  referralPath: string | null;
  tier: {
    current: { label: string; emoji: string; min: number; rewardLdx: number };
    next: { label: string; min: number } | null;
    progressPct: number;
  } | null;
  achievements: AchievementRow[];
  rankThisMonth: number | null;
  performanceMilestones: { activeUsers: number; ldx: number }[];
  rewards: { id: string; kind: string; amountLdx: string; monthKey: string | null; note: string | null; createdAt: string }[];
};

export default function AmbassadorDashboardPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await apiGet<MeResponse>("/v1/ambassador/me");
      setData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/ambassador" className="text-sm font-semibold text-[#2979ff] hover:underline">
          ← Program home
        </Link>
        <button
          type="button"
          onClick={() => load()}
          className="text-xs font-semibold text-white/60 hover:text-white hover:underline"
        >
          Refresh stats
        </button>
      </div>
      <h1 className="mt-4 text-2xl font-bold text-white">Ambassador dashboard</h1>

      {err ? <p className="mt-4 text-sm text-red-300">{err}</p> : null}

      {!data ? (
        !err ? <p className="mt-6 text-sm text-white/50">Loading…</p> : null
      ) : (
        <div className="mt-8 space-y-8">
          {data.application && data.application.status === "pending" ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Application <strong>pending</strong> for @{data.application.username}. We will notify you when reviewed.
            </div>
          ) : null}
          {data.application && data.application.status === "rejected" && !data.profile ? (
            <div className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
              Your application was not approved. You may update and re-apply from{" "}
              <Link href="/ambassador/apply" className="text-[#7aa7ff] underline">
                Apply
              </Link>
              .
            </div>
          ) : null}

          {data.profile?.status === "banned" ? (
            <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Your ambassador access has been revoked. Referral links and rewards through this program are no longer
              active. Contact support if you believe this is a mistake.
            </div>
          ) : null}

          {data.profile && data.profile.status !== "banned" ? (
            <>
              {data.profile.status === "elite" ? (
                <p className="text-sm font-semibold text-amber-200">Elite Ambassador</p>
              ) : null}
              {data.referralPath && origin ? (
                <section className="rounded-xl border border-[#00c896]/25 bg-[#00c896]/10 p-4">
                  <h2 className="text-sm font-bold text-white">Your referral link</h2>
                  <p className="mt-2 break-all font-mono text-xs text-[#b8f5e0] sm:text-sm">
                    {origin}
                    {data.referralPath}
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${origin}${data.referralPath}`);
                    }}
                  >
                    Copy link
                  </button>
                </section>
              ) : null}

              {data.tier ? (
                <AmbassadorProgress
                  tierLabel={data.tier.current.label}
                  tierEmoji={data.tier.current.emoji}
                  nextLabel={data.tier.next ? data.tier.next.label : null}
                  progressPct={data.tier.progressPct}
                  totalPoints={data.profile.totalPoints}
                />
              ) : null}

              <AmbassadorStats
                signups={data.profile.signups}
                activeUsers={data.profile.activeUsers}
                traders={data.profile.traders}
                deposits={data.profile.deposits}
                totalPoints={data.profile.totalPoints}
                ldxRewarded={String(data.profile.ldxRewarded ?? "0")}
                rankThisMonth={data.rankThisMonth}
              />

              <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h2 className="text-sm font-bold text-white">Earnings history</h2>
                {(data.rewards ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-white/45">No program payouts recorded yet.</p>
                ) : (
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
                    {(data.rewards ?? []).map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2"
                      >
                        <span className="font-semibold tabular-nums text-[#00c896]">+{r.amountLdx} LDX</span>
                        <span className="text-xs text-white/50">
                          {r.kind}
                          {r.monthKey ? ` · ${r.monthKey}` : ""}
                          {r.note ? ` — ${r.note}` : ""}
                        </span>
                        <span className="w-full text-[11px] text-white/35">
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h2 className="text-sm font-bold text-white">Performance milestones (LDX)</h2>
                <ul className="mt-2 space-y-1 text-sm text-white/65">
                  {data.performanceMilestones.map((m) => (
                    <li key={m.activeUsers}>
                      {m.activeUsers} active users → {m.ldx} LDX (paid by ops via program rewards)
                    </li>
                  ))}
                </ul>
              </section>

              <AmbassadorAchievements items={data.achievements} />
            </>
          ) : !data.profile ? (
            <div className="rounded-xl border border-white/10 bg-black/30 p-6 text-center">
              <p className="text-sm text-white/70">You are not an ambassador yet.</p>
              <Link
                href="/ambassador/apply"
                className="mt-4 inline-block rounded-xl bg-[#00c896] px-5 py-2.5 text-sm font-bold text-[#0b0f1a]"
              >
                Apply
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
