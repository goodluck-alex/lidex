"use client";

import { useRouter } from "next/navigation";
import { useMode } from "../context/mode";

export function ModeToggle() {
  const router = useRouter();
  const { mode, setMode } = useMode();
  const isDex = mode === "dex";

  function handleToggle() {
    if (mode === "dex") {
      setMode("cex");
      router.push("/cex/trade");
    } else {
      setMode("dex");
      router.push("/dex/swap");
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="shrink-0 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:border-[#00c896]/40 hover:bg-white/[0.09] sm:text-sm"
      aria-label="Toggle DEX/CEX mode"
      title="Toggle DEX/CEX mode"
    >
      {isDex ? "DEX · Lite" : "CEX · Full"}
    </button>
  );
}
