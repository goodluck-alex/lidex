"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BlogRichEditor } from "../../../../components/blog/BlogRichEditor";
import { createBlogPostAction, deleteBlogPostAction, updateBlogPostAction } from "../../blogActions";

export type BlogFormCategory = { slug: string; name: string };

export type BlogPostInitial = {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  category: { slug: string; name: string };
  featuredImage: string | null;
  author: string;
  published: boolean;
  publishedAt: string | null;
  tags: string[];
  seoTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  keywords: string | null;
};

export function BlogPostForm({
  categories,
  initial
}: {
  categories: BlogFormCategory[];
  initial: BlogPostInitial | null;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [categorySlug, setCategorySlug] = useState(initial?.category.slug ?? categories[0]?.slug ?? "growth");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [featuredImage, setFeaturedImage] = useState(initial?.featuredImage ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "Lidex Team");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [publishedAt, setPublishedAt] = useState(() => {
    if (initial?.publishedAt) {
      const d = new Date(initial.publishedAt);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    return "";
  });
  const [tagsRaw, setTagsRaw] = useState((initial?.tags ?? []).join(", "));
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [ogImage, setOgImage] = useState(initial?.ogImage ?? "");
  const [keywords, setKeywords] = useState(initial?.keywords ?? "");

  function buildBody(): Record<string, unknown> {
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return {
      title: title.trim(),
      slug: slug.trim(),
      categorySlug,
      description: description.trim(),
      content,
      featuredImage: featuredImage.trim() || null,
      author: author.trim(),
      published,
      publishedAt: published && publishedAt ? new Date(publishedAt).toISOString() : published ? new Date().toISOString() : null,
      tags,
      seoTitle: seoTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      ogImage: ogImage.trim() || null,
      keywords: keywords.trim() || null
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const body = buildBody();
    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateBlogPostAction(initial.id, body);
        } else {
          await createBlogPostAction(body);
        }
        router.push("/internal-admin/blog");
        router.refresh();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Save failed");
      }
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    if (!window.confirm("Delete this article permanently?")) return;
    setErr(null);
    startTransition(async () => {
      try {
        await deleteBlogPostAction(initial.id);
        router.push("/internal-admin/blog");
        router.refresh();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Delete failed");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-5 pb-16">
      {err ? (
        <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">{err}</div>
      ) : null}

      <label className="block text-sm font-semibold text-white/90">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-white"
        />
      </label>

      <label className="block text-sm font-semibold text-white/90">
        Slug
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 font-mono text-sm text-white"
        />
      </label>

      <label className="block text-sm font-semibold text-white/90">
        Category
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-white"
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-white/90">
        Featured image URL
        <input
          value={featuredImage}
          onChange={(e) => setFeaturedImage(e.target.value)}
          placeholder="https://…"
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="block text-sm font-semibold text-white/90">
        Short description (card + meta fallback)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white"
        />
      </label>

      <div>
        <span className="text-sm font-semibold text-white/90">Content (rich text)</span>
        <div className="mt-2">
          <BlogRichEditor value={content} onChange={setContent} />
        </div>
      </div>

      <label className="block text-sm font-semibold text-white/90">
        Tags (comma-separated)
        <input
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="block text-sm font-semibold text-white/90">
        Author
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-semibold text-white/90">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Published
      </label>

      {published ? (
        <label className="block text-sm font-semibold text-white/90">
          Publish date (local)
          <input
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white"
          />
        </label>
      ) : null}

      <p className="text-xs font-bold uppercase tracking-wide text-white/45">SEO</p>

      <label className="block text-sm font-semibold text-white/90">
        SEO title
        <input
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="block text-sm font-semibold text-white/90">
        Meta description
        <textarea
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="block text-sm font-semibold text-white/90">
        OG image URL
        <input
          value={ogImage}
          onChange={(e) => setOgImage(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="block text-sm font-semibold text-white/90">
        Keywords (comma-separated)
        <input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-sm text-white"
        />
      </label>

      <div className="flex flex-wrap gap-3 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[#00c896] px-5 py-2.5 text-sm font-bold text-[#0b0f1a] disabled:opacity-50"
        >
          {pending ? "Saving…" : isEdit ? "Update article" : "Create article"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/internal-admin/blog")}
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/85"
        >
          Cancel
        </button>
        {isEdit ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-xl border border-red-400/40 bg-red-500/15 px-5 py-2.5 text-sm font-semibold text-red-100 disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
