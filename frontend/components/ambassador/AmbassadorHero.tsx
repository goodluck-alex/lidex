import Link from "next/link";

export function AmbassadorHero() {
  return (
    <header className="relative overflow-hidden border-b border-white/[0.08] bg-[#0d121f]/90">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-20%,rgba(0,200,150,0.2),transparent),radial-gradient(ellipse_50%_40%_at_90%_50%,rgba(41,121,255,0.15),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#00c896]">Lidex Ambassador Program</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
          Earn rewards. Build community.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
          Quality-tracked referrals, monthly leaderboards, LDX rewards, and badges — fully integrated with your Lidex
          account. Apply once; we review every applicant to keep the program professional.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/ambassador/apply"
            className="rounded-xl bg-[#00c896] px-6 py-3 text-sm font-bold text-[#0b0f1a] shadow-lg shadow-[#00c896]/20 transition hover:bg-[#00e0a8]"
          >
            Apply now
          </Link>
          <Link
            href="/ambassador/leaderboard"
            className="rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition hover:border-[#2979ff]/40"
          >
            Leaderboard
          </Link>
          <Link href="/ambassador/dashboard" className="rounded-xl px-6 py-3 text-sm font-semibold text-[#7aa7ff] hover:underline">
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
