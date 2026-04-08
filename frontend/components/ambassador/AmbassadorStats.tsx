export function AmbassadorStats({
  signups,
  activeUsers,
  traders,
  deposits,
  totalPoints,
  ldxRewarded,
  rankThisMonth
}: {
  signups: number;
  activeUsers: number;
  traders: number;
  deposits: number;
  totalPoints: number;
  ldxRewarded: string;
  rankThisMonth: number | null;
}) {
  const cards = [
    { label: "Total referrals", value: signups, hint: "Signups" },
    { label: "Active users", value: activeUsers, hint: "Balances / engagement" },
    { label: "Traders", value: traders, hint: "CEX trades" },
    { label: "Depositors", value: deposits, hint: "On-chain deposits" },
    { label: "Quality points", value: totalPoints, hint: "All-time" },
    { label: "LDX rewarded", value: ldxRewarded, hint: "Program payouts" }
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 shadow-card"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{c.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{c.value}</p>
          <p className="text-xs text-white/40">{c.hint}</p>
        </div>
      ))}
      {rankThisMonth != null ? (
        <div className="rounded-xl border border-[#2979ff]/30 bg-[#2979ff]/10 px-4 py-3 sm:col-span-2 lg:col-span-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7aa7ff]">This month</p>
          <p className="mt-1 text-lg font-bold text-white">Leaderboard rank #{rankThisMonth}</p>
        </div>
      ) : null}
    </div>
  );
}
