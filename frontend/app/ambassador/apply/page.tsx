"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "../../../services/api";

export default function AmbassadorApplyPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      await apiPost("/v1/ambassador/apply", body);
      router.push("/ambassador/dashboard");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Apply failed");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white placeholder:text-white/35";

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <Link href="/ambassador" className="text-sm font-semibold text-[#2979ff] hover:underline">
        ← Program home
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white">Ambassador application</h1>
      <p className="mt-2 text-sm text-white/60">
        Connect your wallet first. Fields marked * are required. We review every application.
      </p>
      {err ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p> : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-white/90">
          Full name *
          <input name="fullName" required className={input} />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Public username * (3–24, letters, numbers, underscore)
          <input name="username" required className={input} pattern="[a-zA-Z0-9_]{3,24}" />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Telegram *
          <input name="telegram" required className={input} placeholder="@handle or link" />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          X (Twitter) *
          <input name="twitter" required className={input} />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Country *
          <input name="country" required className={input} />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Promotion experience *
          <textarea name="promoExperience" required rows={3} className={input} />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          How will you promote Lidex? *
          <textarea name="promotePlan" required rows={4} className={input} />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          YouTube
          <input name="youtube" className={input} />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Discord
          <input name="discord" className={input} />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Website
          <input name="website" type="url" className={input} />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#00c896] py-3 text-sm font-bold text-[#0b0f1a] disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </main>
  );
}
