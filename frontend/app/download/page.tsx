import Link from "next/link";
import React from "react";

export const metadata = {
  title: "Lidex · Download",
  description: "Download the Lidex mobile app for Android and iOS."
};

export default function DownloadPage() {
  return (
    <main className="min-h-dvh bg-[#0b0f1a] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Download Lidex</h1>
        <p className="mt-2 text-sm text-white/65">Install the official Lidex mobile app.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section id="android" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-card">
            <h2 className="text-lg font-semibold">Android</h2>
            <p className="mt-2 text-sm text-white/65">
              If you’re distributing via Play Store, upload the AAB. If you’re distributing directly, share a signed APK.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="#"
                className="rounded-xl bg-[#00c896] px-4 py-2.5 text-center text-sm font-bold text-[#0b0f1a] opacity-60"
                aria-disabled="true"
              >
                Google Play (coming soon)
              </a>
              <a
                href="#"
                className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-center text-sm font-semibold text-white/85 opacity-60"
                aria-disabled="true"
              >
                Direct APK download (coming soon)
              </a>
            </div>
          </section>

          <section id="ios" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-card">
            <h2 className="text-lg font-semibold">iOS</h2>
            <p className="mt-2 text-sm text-white/65">
              iOS builds require a Mac with Xcode. Distribution is done via TestFlight / App Store.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="#"
                className="rounded-xl border border-[#2979ff]/50 bg-[#2979ff]/15 px-4 py-2.5 text-center text-sm font-bold text-white opacity-60"
                aria-disabled="true"
              >
                App Store (coming soon)
              </a>
              <a
                href="#"
                className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-center text-sm font-semibold text-white/85 opacity-60"
                aria-disabled="true"
              >
                TestFlight (coming soon)
              </a>
            </div>
          </section>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-bold text-white/90">Already installed?</h3>
          <p className="mt-1 text-sm text-white/65">Open the app UI in your browser:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/m"
              className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
            >
              Mobile UI preview (/m)
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/80"
            >
              Main website
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

