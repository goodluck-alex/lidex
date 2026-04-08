import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ambassador Program | Lidex",
  description: "Join the Lidex Ambassador Program — quality-tracked referrals, rewards, and monthly leaderboards."
};

export default function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[#0b0f1a] text-white">{children}</div>;
}
