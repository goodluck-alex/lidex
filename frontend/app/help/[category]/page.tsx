"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useMemo } from "react";
import { Card, Grid, PageShell, Span } from "../../../components/ui";
import {
  getHelpCategory,
  listHelpArticlesByCategory,
  type HelpCategoryId,
  HELP_CATEGORIES
} from "../../../lib/helpCenter/helpContent";

export default function HelpCategoryPage() {
  const params = useParams();
  const categoryId = String(params?.category || "") as HelpCategoryId;
  const category = getHelpCategory(categoryId);

  const items = useMemo(() => {
    if (!category) return [];
    return listHelpArticlesByCategory(category.id);
  }, [category]);

  if (!category) {
    return (
      <PageShell title="Help Center" subtitle="Category not found.">
        <Card surface="deep">
          <p className="text-sm text-white/70">
            This category does not exist. Go back to{" "}
            <Link className="text-[#7aa7ff] underline" href="/help">
              Help Center
            </Link>
            .
          </p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title={category.title} subtitle={category.description}>
      <Grid>
        <Span col={12}>
          <Card surface="deep">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/45">Articles</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((a) => (
                <Link
                  key={a.slug}
                  href={`/help/${category.id}/${a.slug}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                >
                  <div className="text-sm font-semibold text-white/95">{a.title}</div>
                  <div className="mt-1 text-xs text-white/60">{a.description}</div>
                </Link>
              ))}
            </div>
          </Card>
        </Span>

        <Span col={12}>
          <Card title="All categories" surface="deep">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {HELP_CATEGORIES.map((c) => (
                <Link
                  key={c.id}
                  href={`/help/${c.id}`}
                  className={`rounded-2xl border border-white/10 p-4 transition ${
                    c.id === category.id ? "bg-[#00c896]/10" : "bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-lg" aria-hidden>
                      {c.icon}
                    </div>
                    <div className="text-sm font-semibold text-white/90">{c.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </Span>
      </Grid>
    </PageShell>
  );
}

