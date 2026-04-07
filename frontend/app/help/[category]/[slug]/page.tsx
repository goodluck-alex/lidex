"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useMemo } from "react";
import { Card, Grid, PageShell, Span } from "../../../../components/ui";
import { HelpFaqAccordion } from "../../../../components/help/HelpFaqAccordion";
import { HelpMarkdown } from "../../../../components/help/HelpMarkdown";
import {
  getHelpArticle,
  getHelpCategory,
  listHelpArticlesByCategory,
  type HelpCategoryId
} from "../../../../lib/helpCenter/helpContent";

export default function HelpArticlePage() {
  const params = useParams();
  const categoryId = String(params?.category || "") as HelpCategoryId;
  const slug = String(params?.slug || "");
  const category = getHelpCategory(categoryId);

  const article = useMemo(() => getHelpArticle(categoryId, slug), [categoryId, slug]);
  const siblings = useMemo(() => {
    if (!category) return [];
    return listHelpArticlesByCategory(category.id).slice(0, 8);
  }, [category]);

  if (!category || !article) {
    return (
      <PageShell title="Help Center" subtitle="Article not found.">
        <Card surface="deep">
          <p className="text-sm text-white/70">
            Go back to{" "}
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
    <PageShell title={article.title} subtitle={article.description}>
      <Grid>
        <Span col={12}>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/55">
            <Link className="text-[#7aa7ff] hover:underline" href="/help">
              Help Center
            </Link>
            <span>/</span>
            <Link className="text-[#7aa7ff] hover:underline" href={`/help/${category.id}`}>
              {category.title}
            </Link>
            <span>/</span>
            <span className="text-white/70">{article.title}</span>
          </div>
        </Span>

        <Span col={12}>
          <Card surface="deep">
            <div className="text-[11px] text-white/45">Updated {new Date(article.updatedAt).toLocaleDateString()}</div>
            <HelpMarkdown md={article.bodyMd} />
            {article.faqs?.length ? (
              <>
                <h3 className="mt-8 text-sm font-bold text-white/90">FAQs</h3>
                <HelpFaqAccordion faqs={article.faqs} />
              </>
            ) : null}
          </Card>
        </Span>

        <Span col={12}>
          <Card title="More in this category" surface="deep">
            <div className="grid gap-2 sm:grid-cols-2">
              {siblings.map((a) => (
                <Link
                  key={a.slug}
                  href={`/help/${category.id}/${a.slug}`}
                  className={`rounded-2xl border border-white/10 p-4 transition ${
                    a.slug === article.slug ? "bg-[#00c896]/10" : "bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="text-sm font-semibold text-white/90">{a.title}</div>
                  <div className="mt-1 text-xs text-white/60">{a.description}</div>
                </Link>
              ))}
            </div>
          </Card>
        </Span>
      </Grid>
    </PageShell>
  );
}

