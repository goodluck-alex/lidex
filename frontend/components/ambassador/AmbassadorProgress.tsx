export function AmbassadorProgress({
  tierLabel,
  tierEmoji,
  nextLabel,
  progressPct,
  totalPoints
}: {
  tierLabel: string;
  tierEmoji: string;
  nextLabel: string | null;
  progressPct: number;
  totalPoints: number;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-white">Rank progress</h2>
        <span className="text-2xl" aria-hidden>
          {tierEmoji}
        </span>
      </div>
      <p className="mt-1 text-lg font-semibold text-white">
        {tierLabel}
        <span className="ml-2 text-sm font-normal text-white/50">· {totalPoints} pts</span>
      </p>
      {nextLabel ? (
        <>
          <p className="mt-3 text-xs text-white/50">Progress toward {nextLabel}</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2979ff] to-[#00c896] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs font-semibold tabular-nums text-[#00c896]">{progressPct}%</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-[#00c896]">You are at the top tier — keep growing your network.</p>
      )}
      <ul className="mt-4 grid gap-1 text-xs text-white/45 sm:grid-cols-2">
        <li>🥉 Bronze 0–100 · 100 LDX tier reward</li>
        <li>🥈 Silver 100–500 · 500 LDX</li>
        <li>🥇 Gold 500–1000 · 1500 LDX</li>
        <li>💎 Diamond 1000+ · 5000 LDX</li>
      </ul>
    </section>
  );
}
