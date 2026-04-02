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
      style={{
        border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.06)",
        color: "white",
        padding: "8px 12px",
        borderRadius: 10,
        cursor: "pointer"
      }}
      aria-label="Toggle DEX/CEX mode"
      title="Toggle DEX/CEX mode"
    >
      {isDex ? "DEX (Lite)" : "CEX (Full)"}
    </button>
  );
}

