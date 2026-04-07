"use client";

import React, { useState } from "react";
import type { HelpFaq } from "../../lib/helpCenter/helpContent";

export function HelpFaqAccordion({ faqs }: { faqs: HelpFaq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!faqs?.length) return null;

  return (
    <div className="mt-6 space-y-2">
      {faqs.map((f, idx) => {
        const on = open === idx;
        return (
          <button
            key={f.q + idx}
            type="button"
            onClick={() => setOpen((x) => (x === idx ? null : idx))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-white/90">{f.q}</div>
              <div className="shrink-0 text-white/40">{on ? "−" : "+"}</div>
            </div>
            {on ? <div className="mt-2 text-sm leading-relaxed text-white/70">{f.a}</div> : null}
          </button>
        );
      })}
    </div>
  );
}

