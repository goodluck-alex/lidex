import Link from "next/link";
import type { BlogListItemDto } from "../../lib/blogApi";

export function BlogHero({ post }: { post: BlogListItemDto }) {
  const date =
    post.publishedAt != null
      ? new Date(post.publishedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric"
        })
      : "";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-r from-[#1a2744]/90 to-[#0d3d32]/80">
      <div className="grid gap-0 md:grid-cols-2">
        <div className="relative aspect-[16/10] max-h-[280px] md:max-h-none md:min-h-[240px]">
          {post.featuredImage ? (
            <img src={post.featuredImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#2979ff]/30 to-[#00c896]/25" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-transparent to-transparent md:bg-gradient-to-r" />
        </div>
        <div className="flex flex-col justify-center p-5 sm:p-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00c896]">Featured</span>
          <span className="mt-1 text-xs font-semibold text-white/50">{post.category.name}</span>
          <h2 className="mt-2 text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl">{post.title}</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/65 sm:line-clamp-4">{post.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/45">
            {date ? <span>{date}</span> : null}
            {post.readingMinutes != null ? <span>{post.readingMinutes} min read</span> : null}
            <span>By {post.author}</span>
          </div>
          <Link
            href={`/blog/${post.slug}`}
            className="mt-5 inline-flex w-fit rounded-xl bg-[#2979ff] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5c9dff]"
          >
            Read article
          </Link>
        </div>
      </div>
    </section>
  );
}
