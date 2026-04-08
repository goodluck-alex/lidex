import Link from "next/link";
import { AmbassadorHero } from "../../components/ambassador/AmbassadorHero";

export default function AmbassadorLandingPage() {
  return (
    <main>
      <AmbassadorHero />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <h2 className="text-center text-lg font-bold text-white sm:text-xl">How it works</h2>
        <ol className="mt-8 space-y-4 text-sm leading-relaxed text-white/70">
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2979ff]/25 text-sm font-bold text-[#7aa7ff]">
              1
            </span>
            <span>
              Tap <strong className="text-white">Ambassador</strong> in Quick access, submit your application, and wait
              for review (pending → approved).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2979ff]/25 text-sm font-bold text-[#7aa7ff]">
              2
            </span>
            <span>
              Share your link <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">/ambassador/ref/yourname</code>{" "}
              — referrals attach the same way as the main ref program.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2979ff]/25 text-sm font-bold text-[#7aa7ff]">
              3
            </span>
            <span>
              Earn <strong className="text-white">quality points</strong> when invites sign up, become active, trade, or
              deposit. Climb Bronze → Diamond and unlock monthly leaderboard placement.
            </span>
          </li>
        </ol>
        <div className="mt-10 text-center">
          <Link href="/" className="text-sm font-semibold text-[#2979ff] hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
