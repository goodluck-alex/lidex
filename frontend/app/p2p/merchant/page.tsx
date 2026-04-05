"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "../../../components/ui";
import { apiGet, apiPost } from "../../../services/api";
import { me } from "../../../wallet/auth";

export default function P2PMerchantPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [application, setApplication] = useState<{ status: string; createdAt: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [experience, setExperience] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const m = await me();
      const uid = m.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const s = await apiGet<{ ok: true; verified: boolean; application: { status: string; createdAt: string } | null }>(
        "/v1/p2p/merchant/status"
      );
      setVerified(s.verified);
      setApplication(s.application);
    } catch {
      setVerified(false);
      setApplication(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function apply() {
    setMsg(null);
    if (!userId) return;
    try {
      await apiPost("/v1/p2p/merchant/apply", {
        fullName,
        email,
        country,
        tradingExperience: experience,
        reason
      });
      setMsg("Application submitted. Our team will review it.");
      void refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/p2p" className="text-sm text-[#7aa7ff] hover:underline">
          ← P2P home
        </Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0B0F1A] p-5 shadow-xl">
        <h1 className="text-lg font-semibold text-white">Become a merchant</h1>
        <p className="mt-2 text-sm text-gray-400">
          Verified merchants get higher visibility in P2P Trading, higher ad limits (coming soon), and lower fees (coming soon). Applications are reviewed by Lidex admins.
        </p>

        {!userId ? (
          <p className="mt-4 text-sm text-white/70">
            <Link className="text-[#7aa7ff] underline" href="/wallet">
              Sign in
            </Link>{" "}
            to apply.
          </p>
        ) : verified ? (
          <p className="mt-4 text-sm text-[#b8f5e0]">Your account is a verified P2P merchant.</p>
        ) : application?.status === "pending" ? (
          <p className="mt-4 text-sm text-white/80">Application pending since {new Date(application.createdAt).toLocaleDateString()}.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-white/50">Full name</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-white/50">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-white/50">Country</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-white/50">Trading experience</label>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-white/50">Why merchant?</label>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => void apply()}>Apply</Button>
            </div>
          </div>
        )}

        {msg ? <p className="mt-4 text-sm text-white/85">{msg}</p> : null}
      </div>
    </div>
  );
}
