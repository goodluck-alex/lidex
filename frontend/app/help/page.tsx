"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Card, Grid, PageShell, Span } from "../../components/ui";
import { HELP_ARTICLES, HELP_CATEGORIES, popularHelpArticles } from "../../lib/helpCenter/helpContent";

function norm(s: string) {
  return String(s || "").toLowerCase().trim();
}

export default function HelpHomePage() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = norm(q);
    if (!query) return [];
    const words = query.split(/\s+/).filter(Boolean);
    const scored = HELP_ARTICLES.map((a) => {
      const hay = norm([a.title, a.description, a.keywords.join(" "), a.bodyMd].join(" "));
      let score = 0;
      for (const w of words) {
        if (a.title.toLowerCase().includes(w)) score += 5;
        if (a.description.toLowerCase().includes(w)) score += 3;
        if (a.keywords.some((k) => norm(k).includes(w))) score += 3;
        if (hay.includes(w)) score += 1;
      }
      return { a, score };
    })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 18);
    return scored.map((x) => x.a);
  }, [q]);

  const popular = useMemo(() => popularHelpArticles(8), []);

  return (
    <PageShell
      title="Help Center"
      subtitle="Search for answers about trading, wallet, swap, P2P, fees, and the mobile app."
    >
      <Grid>
        <Span col={12}>
          <Card surface="deep">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/45">Help Center Search</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search for help… (e.g. deposit, swap slippage, p2p ads)"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#00c896]/40"
                />
              </div>
              <div className="text-xs text-white/45">
                Tip: try <span className="text-white/70">“P2P”</span>, <span className="text-white/70">“withdraw”</span>,{" "}
                <span className="text-white/70">“APK”</span>.
              </div>
            </div>

            {q.trim() ? (
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/45">Results</div>
                {results.length === 0 ? (
                  <div className="mt-2 text-sm text-white/60">No matches. Try different keywords.</div>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {results.map((a) => (
                      <Link
                        key={`${a.category}/${a.slug}`}
                        href={`/help/${a.category}/${a.slug}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                      >
                        <div className="text-sm font-semibold text-white/95">{a.title}</div>
                        <div className="mt-1 text-xs text-white/60">{a.description}</div>
                        <div className="mt-2 text-[11px] text-white/45">
                          Category:{" "}
                          <span className="text-white/65">
                            {HELP_CATEGORIES.find((c) => c.id === a.category)?.title ?? a.category}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        </Span>

        <Span col={12}>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Popular articles" surface="deep">
              <div className="space-y-2">
                {popular.map((a) => (
                  <Link
                    key={`${a.category}/${a.slug}`}
                    href={`/help/${a.category}/${a.slug}`}
                    className="block rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]"
                  >
                    <div className="text-sm font-semibold text-white/90">{a.title}</div>
                    <div className="text-xs text-white/55">{a.description}</div>
                  </Link>
                ))}
              </div>
            </Card>

            <div className="lg:col-span-2">
              <Card title="Categories" surface="deep">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {HELP_CATEGORIES.map((c) => (
                    <Link
                      key={c.id}
                      href={`/help/${c.id}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-lg" aria-hidden>
                          {c.icon}
                        </div>
                        <div className="text-sm font-semibold text-white/95">{c.title}</div>
                      </div>
                      <div className="mt-1 text-xs text-white/60">{c.description}</div>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </Span>
      </Grid>
    </PageShell>
  );
}

