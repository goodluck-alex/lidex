import Link from "next/link";
import type { BlogListItemDto } from "../../lib/blogApi";

const catColors: Record<string, string> = {
  growth: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  education: "bg-[#2979ff]/20 text-[#7aa7ff] border-[#2979ff]/35",
  marketing: "bg-amber-500/15 text-amber-200 border-amber-500/25"
};

export function BlogCard({ post }: { post: BlogListItemDto }) {
  const badgeClass = catColors[post.category.slug] || "bg-white/10 text-white/80 border-white/15";
  const date =
    post.publishedAt != null
      ? new Date(post.publishedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        })
      : "Draft";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-card transition hover:border-[#2979ff]/35 hover:bg-white/[0.05]">
      <Link href={`/blog/${post.slug}`} className="block shrink-0 overflow-hidden">
        <div className="aspect-[16/9] w-full bg-[#0d121f]">
          {post.featuredImage ? (
            <img
              src={post.featuredImage}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2979ff]/20 to-[#00c896]/15 text-4xl font-black text-white/20">
              L
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span
          className={`inline-block w-fit rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}
        >
          {post.category.name}
        </span>
        <Link href={`/blog/${post.slug}`}>
          <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-white group-hover:text-[#7aa7ff] sm:text-lg">
            {post.title}
          </h2>
        </Link>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-white/60">{post.description}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-[11px] text-white/45 sm:text-xs">
          <span>{date}</span>
          {post.readingMinutes != null ? <span>{post.readingMinutes} min read</span> : null}
        </div>
        <Link
          href={`/blog/${post.slug}`}
          className="mt-3 text-sm font-semibold text-[#00c896] hover:text-[#33ddb3] hover:underline"
        >
          Read more →
        </Link>
      </div>
    </article>
  );
}
