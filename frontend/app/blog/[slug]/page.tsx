import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogArticleBody } from "../../../components/blog/BlogArticleBody";
import { BlogCard } from "../../../components/blog/BlogCard";
import { BlogCTA } from "../../../components/blog/BlogCTA";
import { BlogShare } from "../../../components/blog/BlogShare";
import { fetchBlogPostBySlug, fetchBlogPostBySlugNoStore } from "../../../lib/blogApi";
import { requestOrigin } from "../../../lib/requestOrigin";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchBlogPostBySlugNoStore(slug);
  if (!data) {
    return { title: "Article | Lidex Blog" };
  }
  const p = data.post;
  const title = p.seoTitle || p.title;
  const description = (p.metaDescription || p.description).slice(0, 320);
  const og = p.ogImage || p.featuredImage;
  const kw = p.keywords
    ? p.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined;
  return {
    title: `${title} | Lidex Blog`,
    description,
    keywords: kw,
    openGraph: {
      title,
      description,
      ...(og ? { images: [{ url: og }] } : {})
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(og ? { images: [og] } : {})
    }
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  let data;
  try {
    data = await fetchBlogPostBySlug(slug);
  } catch {
    notFound();
  }

  const { post, related } = data;
  const origin = await requestOrigin();
  const shareUrl = origin ? `${origin}/blog/${encodeURIComponent(post.slug)}` : `/blog/${post.slug}`;

  const date =
    post.publishedAt != null
      ? new Date(post.publishedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric"
        })
      : "";

  return (
    <main className="min-h-screen bg-[#0b0f1a] pb-16 text-white">
      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Link href="/blog" className="text-sm font-semibold text-[#2979ff] hover:underline">
          ← All articles
        </Link>

        <header className="mt-6">
          <span className="text-xs font-bold uppercase tracking-wide text-[#00c896]">{post.category.name}</span>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/50">
            {date ? <time dateTime={post.publishedAt ?? undefined}>{date}</time> : null}
            <span>By {post.author}</span>
            {post.readingMinutes != null ? <span>{post.readingMinutes} min read</span> : null}
          </div>
        </header>

        {post.featuredImage ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08]">
            <img src={post.featuredImage} alt="" className="aspect-[16/9] w-full object-cover" />
          </div>
        ) : null}

        <div className="mt-10">
          <BlogArticleBody html={post.content} />
        </div>

        {post.tags.length > 0 ? (
          <ul className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <li
                key={t}
                className="rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/70"
              >
                {t}
              </li>
            ))}
          </ul>
        ) : null}

        <BlogShare title={post.title} url={shareUrl} />

        {related.length > 0 ? (
          <section className="mt-14 border-t border-white/[0.08] pt-10">
            <h2 className="text-lg font-bold text-white">Related articles</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {related.map((r) => (
                <BlogCard key={r.id} post={r} />
              ))}
            </div>
          </section>
        ) : null}

        <BlogCTA />
      </article>
    </main>
  );
}
