import Link from "next/link";
import React, { type ReactNode } from "react";

const LDX_BSCSCAN = "https://bscscan.com/token/0x567a4f63f6838005e104c053fc24a3510b0432e1";

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "What is P2P?",
    a: "Peer-to-peer trading: you exchange fiat with another user for crypto (or the reverse), coordinated on Lidex with ads, orders, timers, and chat."
  },
  {
    q: "What is LDX in P2P?",
    a: (
      <>
        LDX is the Lidex token (BEP-20 on BNB Smart Chain). You can list and match LDX ads like USDT or other supported assets. Verify the contract on{" "}
        <a href={LDX_BSCSCAN} target="_blank" rel="noopener noreferrer" className="text-[#7aa7ff] underline hover:text-[#9bc0ff]">
          BscScan
        </a>
        .
      </>
    )
  },
  {
    q: "How long do I have to pay?",
    a: "Each ad sets a time limit (often 15 minutes). The order timer counts down; if payment isn’t completed in time, the order may expire."
  },
  {
    q: "Is P2P safe?",
    a: "Use verified merchants when possible, keep chat on-platform, and never pay outside the agreed terms. Full custodial escrow for CEX balances is planned; today’s flow tracks status, timers, and confirmations in-app."
  },
  {
    q: "When is crypto released?",
    a: "After you mark paid, the seller confirms receipt and releases. Always confirm you received fiat before releasing if you are the seller."
  }
];

export default function P2PFaqPage() {
  return (
    <div>
      <div className="mb-4">
        <Link href="/p2p" className="text-sm text-[#7aa7ff] hover:underline">
          ← P2P home
        </Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0B0F1A] p-5 shadow-xl">
        <h1 className="text-lg font-semibold text-white">FAQs</h1>
        <div className="mt-4 space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-white/[0.06] pb-4 last:border-0">
              <div className="font-semibold text-white/95">{f.q}</div>
              <div className="mt-1 text-sm leading-relaxed text-gray-400">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
