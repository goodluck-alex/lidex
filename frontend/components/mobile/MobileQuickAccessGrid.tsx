"use client";

import Link from "next/link";
import React, { useState } from "react";
import { pinnedServicesForMobileApp, SERVICE_GROUPS } from "../../lib/lidexServicesCatalog";

const tile =
  "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-center shadow-md shadow-black/20 transition active:scale-[0.98] hover:border-[#00c896]/35 hover:bg-white/[0.07]";

const moreTile =
  `${tile} cursor-pointer border-dashed border-white/20 hover:border-[#f0b90b]/50`;

export function MobileQuickAccessGrid() {
  const [expanded, setExpanded] = useState(false);
  const pinned = pinnedServicesForMobileApp();

  return (
    <section className="px-3 py-4" id="mobile-more-services">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-bold text-white/90">Quick access</h2>
        {expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs font-semibold text-[#7aa7ff] hover:underline"
          >
            Show less
          </button>
        ) : null}
      </div>

      {!expanded ? (
        <div className="grid grid-cols-4 gap-2">
          {pinned.map((f) => (
            <Link key={f.href + f.label} href={f.href} className={tile}>
              <span className="text-lg leading-none" aria-hidden>
                {f.icon}
              </span>
              <span className="max-w-[4.5rem] text-[10px] font-semibold leading-tight text-white/90">{f.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={moreTile}
            aria-expanded={false}
          >
            <span className="text-lg leading-none text-[#f0b90b]" aria-hidden>
              ⋯
            </span>
            <span className="max-w-[4.5rem] text-[10px] font-semibold leading-tight text-white/90">More</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {SERVICE_GROUPS.map((g) => (
            <div key={g.category}>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/45">{g.category}</h3>
              <div className="grid grid-cols-4 gap-2">
                {g.items.map((f) => (
                  <Link key={`${g.category}-${f.href}-${f.label}`} href={f.href} className={tile}>
                    <span className="text-lg leading-none" aria-hidden>
                      {f.icon}
                    </span>
                    <span className="max-w-[4.5rem] text-[10px] font-semibold leading-tight text-white/90">{f.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
