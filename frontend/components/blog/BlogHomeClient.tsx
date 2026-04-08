"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { backendBaseUrl } from "../../services/api";
import type { BlogCategoryDto, BlogListItemDto } from "../../lib/blogApi";
import { BlogCard } from "./BlogCard";
import { BlogCategories } from "./BlogCategories";
import { BlogCTA } from "./BlogCTA";
import { BlogHero } from "./BlogHero";

type Tab = "all" | "growth" | "education" | "marketing";

export function BlogHomeClient() {
  const [categories, setCategories] = useState<BlogCategoryDto[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [featured, setFeatured] = useState<BlogListItemDto | null>(null);
  const [list, setList] = useState<BlogListItemDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const categoryParam = tab === "all" ? undefined : tab;

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      setErr(null);
      setLoading(true);
      try {
        const u = new URLSearchParams();
        u.set("page", String(nextPage));
        u.set("limit", "12");
        if (categoryParam) u.set("category", categoryParam);
        if (debouncedSearch) u.set("search", debouncedSearch);
        const res = await fetch(`${backendBaseUrl()}/v1/blog/posts?${u.toString()}`);
        const data = (await res.json()) as {
          ok?: boolean;
          items?: BlogListItemDto[];
          hasMore?: boolean;
          total?: number;
        };
        if (!res.ok || !data.ok || !Array.isArray(data.items)) {
          throw new Error("Failed to load posts");
        }
        setHasMore(Boolean(data.hasMore));
        setTotal(data.total ?? 0);
        setPage(nextPage);

        if (append) {
          setList((prev) => [...prev, ...data.items!]);
        } else if (nextPage === 1) {
          const rows = data.items!;
          if (rows.length === 0) {
            setFeatured(null);
            setList([]);
          } else {
            setFeatured(rows[0]!);
            setList(rows.length > 1 ? rows.slice(1) : []);
          }
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        if (!append) {
          setFeatured(null);
          setList([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [categoryParam, debouncedSearch]
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${backendBaseUrl()}/v1/blog/categories`);
        const data = (await res.json()) as { ok?: boolean; categories?: BlogCategoryDto[] };
        if (data.ok && data.categories) setCategories(data.categories);
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage, tab, debouncedSearch]);

  return (
    <main className="min-h-screen bg-[#0b0f1a] pb-16 text-white">
      <header className="border-b border-white/[0.06] bg-[#0d121f]/80">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#00c896] sm:text-xs">Lidex</p>
          <h1 className="mt-2 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Blog</h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/60 sm:text-base">
            Growth, education, and product updates — learn how to get the most from Lidex Exchange.
          </p>
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm font-semibold text-[#2979ff] hover:underline">
              ← Back to home
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <BlogCategories active={tab} onChange={setTab} />

        <div className="mt-4">
          <label htmlFor="blog-search" className="sr-only">
            Search articles
          </label>
          <input
            id="blog-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search articles…"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#2979ff]/50 focus:outline-none"
          />
        </div>

        {err ? (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</p>
        ) : null}

        {loading && list.length === 0 && !featured ? (
          <p className="mt-10 text-center text-sm text-white/50">Loading articles…</p>
        ) : null}

        {!loading && !featured && list.length === 0 && !err ? (
          <p className="mt-10 text-center text-sm text-white/50">No articles yet. Check back soon.</p>
        ) : null}

        {featured ? (
          <div className="mt-6">
            <BlogHero post={featured} />
          </div>
        ) : null}

        {list.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        ) : null}

        {hasMore ? (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              disabled={loading}
              onClick={() => loadPage(page + 1, true)}
              className="rounded-xl border border-white/15 bg-white/[0.06] px-6 py-2.5 text-sm font-semibold text-white transition hover:border-[#2979ff]/40 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}

        {total > 0 ? <p className="mt-6 text-center text-xs text-white/40">{total} article{total === 1 ? "" : "s"}</p> : null}

        {categories.length > 0 ? (
          <section className="mt-12 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Categories</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setTab(c.slug as Tab)}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-[#00c896]/40"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <BlogCTA />
      </div>
    </main>
  );
}
