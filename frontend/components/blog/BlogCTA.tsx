import Link from "next/link";
import { SiGoogleplay } from "react-icons/si";
import { FaApple } from "react-icons/fa";
import { ANDROID_APK_URL } from "../../lib/siteUrls";
import { LIDEX_TELEGRAM_URL, LIDEX_TWITTER_URL } from "../../lib/social";

const IOS_URL = "#";

export function BlogCTA() {
  return (
    <section
      className="mt-14 rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#2979ff]/15 via-[#0d121f] to-[#00c896]/12 px-5 py-8 sm:px-8 sm:py-10"
      aria-label="Get the Lidex app"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-lg font-extrabold tracking-tight sm:text-xl">
          <span className="bg-gradient-to-r from-[#2979ff] to-[#00c896] bg-clip-text text-transparent">Lidex</span>
        </p>
        <p className="mt-2 text-sm font-semibold text-white/90 sm:text-base">Trade Freely. Trade Powerfully.</p>
        <p className="mt-1 text-xs text-white/50 sm:text-sm">Download the app and trade on the go.</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={ANDROID_APK_URL}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00c896] px-5 py-2.5 text-sm font-bold text-[#0b0f1a] shadow-lg shadow-[#00c896]/15 transition hover:bg-[#00e0a8]"
            download
          >
            <SiGoogleplay size={20} aria-hidden />
            Android
          </a>
          <a
            href={IOS_URL}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2979ff]/45 bg-[#2979ff]/12 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#2979ff]/22"
            {...(IOS_URL !== "#" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <FaApple size={20} aria-hidden />
            iOS
          </a>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-semibold">
          <a href={LIDEX_TWITTER_URL} target="_blank" rel="noopener noreferrer" className="text-[#7aa7ff] hover:underline">
            X (Twitter)
          </a>
          <a href={LIDEX_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-[#7aa7ff] hover:underline">
            Telegram
          </a>
        </div>

        <div className="mt-8">
          <Link
            href="/cex/trade"
            className="inline-flex rounded-xl bg-[#2979ff] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#2979ff]/20 transition hover:bg-[#5c9dff]"
          >
            Start trading
          </Link>
        </div>
      </div>
    </section>
  );
}
