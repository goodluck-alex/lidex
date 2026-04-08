"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";

export type PromoSlide = {
  id: string;
  tag: string;
  title: string;
  desc: string;
  href: string;
  accent?: "green" | "blue";
};

const AUTO_MS = 4500;

export function MobilePromoCarousel({ slides }: { slides: PromoSlide[] }) {
  const [i, setI] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const paused = useRef(false);

  const n = slides.length;
  const next = useCallback(() => setI((x) => (x + 1) % n), [n]);
  const prev = useCallback(() => setI((x) => (x - 1 + n) % n), [n]);

  useEffect(() => {
    if (n <= 1) return;
    const id = window.setInterval(() => {
      if (!paused.current) next();
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [n, next]);

  if (n === 0) return null;

  const slide = slides[i];
  const external = /^https?:\/\//i.test(slide.href);

  return (
    <section
      className="px-3 pt-2"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
        paused.current = true;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        paused.current = false;
        if (start == null) return;
        const end = e.changedTouches[0]?.clientX ?? start;
        const d = end - start;
        if (d > 50) prev();
        else if (d < -50) next();
      }}
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br p-4 shadow-lg shadow-[#00c896]/10 ${
          slide.accent === "blue"
            ? "from-[#1a2744] to-[#0b0f1a]"
            : "from-[#0d3d32] to-[#0b0f1a]"
        }`}
      >
        <span className="inline-block rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00c896]">
          {slide.tag}
        </span>
        <h3 className="mt-2 text-base font-bold leading-snug text-white">{slide.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/65">{slide.desc}</p>
        {external ? (
          <a
            href={slide.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-[#7aa7ff]"
          >
            Learn more →
          </a>
        ) : (
          <Link href={slide.href} className="mt-3 inline-block text-sm font-semibold text-[#7aa7ff]">
            Learn more →
          </Link>
        )}
        <div className="mt-4 flex justify-center gap-1.5" role="tablist" aria-label="Promotions">
          {slides.map((_, idx) => (
            <button
              key={slides[idx].id}
              type="button"
              role="tab"
              aria-selected={idx === i}
              aria-label={`Slide ${idx + 1} of ${n}`}
              onClick={() => setI(idx)}
              className={`h-1 rounded-full transition-all ${idx === i ? "w-6 bg-[#00c896]" : "w-1.5 bg-white/25"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
