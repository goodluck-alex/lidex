import Link from "next/link";
import React from "react";

export const metadata = {
  title: "Lidex · Wallet"
};

export default function MobileWalletHubPage() {
  return (
    <div className="min-h-dvh px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <h1 className="text-xl font-bold">Wallet</h1>
      <p className="mt-2 text-sm text-white/60">Connect, balances, deposits and withdrawals — same wallet page as the website.</p>
      <Link
        href="/wallet"
        className="mt-6 block w-full rounded-2xl border border-white/15 bg-white/[0.06] py-4 text-center text-sm font-bold text-white"
      >
        Open wallet
      </Link>
    </div>
  );
}
