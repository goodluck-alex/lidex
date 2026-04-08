export type LeaderRow = {
  rank: number;
  username: string;
  pointsThisMonth: number;
  badge: string;
  status: string;
};

export function AmbassadorLeaderboard({ monthKey, rows }: { monthKey: string; rows: LeaderRow[] }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0d121f]/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-bold text-white">Monthly leaderboard</h2>
        <p className="text-xs text-white/45">{monthKey} · resets each calendar month</p>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-white/50">No points recorded for this month yet.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {rows.map((r) => (
            <li
              key={r.username}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5"
            >
              <span className="w-8 text-center text-sm font-bold text-[#7aa7ff]">#{r.rank}</span>
              <span className="text-lg" aria-hidden>
                {r.badge}
              </span>
              <span className="flex-1 font-semibold text-white">{r.username}</span>
              {r.status === "elite" ? (
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                  Elite
                </span>
              ) : null}
              <span className="text-sm tabular-nums text-white/80">{r.pointsThisMonth} pts</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
