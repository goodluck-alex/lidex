/**
 * Public blog API (backend `/v1/blog/*`). No admin key; safe for browser or SSR.
 */

function backendBase(): string {
  return String(
    process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
  ).replace(/\/+$/u, "");
}

export type BlogCategoryDto = { id: string; name: string; slug: string };

export type BlogListItemDto = {
  id: string;
  slug: string;
  title: string;
  description: string;
  featuredImage: string | null;
  author: string;
  publishedAt: string | null;
  readingMinutes: number | null;
  category: { name: string; slug: string };
  tags: string[];
};

export type BlogPostDetailDto = BlogListItemDto & {
  content: string;
  seoTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  keywords: string | null;
  updatedAt: string;
};

export async function fetchBlogCategories(): Promise<{ ok: true; categories: BlogCategoryDto[] }> {
  const res = await fetch(`${backendBase()}/v1/blog/categories`, {
    next: { revalidate: 300 }
  });
  const data = (await res.json()) as { ok?: boolean; categories?: BlogCategoryDto[] };
  if (!res.ok || !data.ok || !data.categories) {
    throw new Error("Failed to load blog categories");
  }
  return { ok: true, categories: data.categories };
}

export async function fetchBlogPosts(q: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<{
  ok: true;
  items: BlogListItemDto[];
  page: number;
  hasMore: boolean;
  total: number;
}> {
  const u = new URLSearchParams();
  if (q.page != null) u.set("page", String(q.page));
  if (q.limit != null) u.set("limit", String(q.limit));
  if (q.category) u.set("category", q.category);
  if (q.search) u.set("search", q.search);
  const res = await fetch(`${backendBase()}/v1/blog/posts?${u.toString()}`, {
    next: { revalidate: 120 }
  });
  const data = (await res.json()) as {
    ok?: boolean;
    items?: BlogListItemDto[];
    page?: number;
    hasMore?: boolean;
    total?: number;
  };
  if (!res.ok || !data.ok || !Array.isArray(data.items)) {
    throw new Error("Failed to load blog posts");
  }
  return {
    ok: true,
    items: data.items,
    page: data.page ?? 1,
    hasMore: Boolean(data.hasMore),
    total: data.total ?? 0
  };
}

export async function fetchBlogPostBySlug(slug: string): Promise<{
  ok: true;
  post: BlogPostDetailDto;
  related: BlogListItemDto[];
}> {
  const res = await fetch(`${backendBase()}/v1/blog/posts/${encodeURIComponent(slug)}`, {
    next: { revalidate: 120 }
  });
  const data = (await res.json()) as {
    ok?: boolean;
    post?: BlogPostDetailDto;
    related?: BlogListItemDto[];
  };
  if (!res.ok || !data.ok || !data.post) {
    throw new Error("not found");
  }
  return {
    ok: true,
    post: data.post,
    related: Array.isArray(data.related) ? data.related : []
  };
}

/** Uncached fetch for generateMetadata / no-store paths. */
export async function fetchBlogPostBySlugNoStore(slug: string) {
  const res = await fetch(`${backendBase()}/v1/blog/posts/${encodeURIComponent(slug)}`, {
    cache: "no-store"
  });
  const data = (await res.json()) as {
    ok?: boolean;
    post?: BlogPostDetailDto;
    related?: BlogListItemDto[];
  };
  if (!res.ok || !data.ok || !data.post) return null;
  return { post: data.post, related: Array.isArray(data.related) ? data.related : [] };
}
