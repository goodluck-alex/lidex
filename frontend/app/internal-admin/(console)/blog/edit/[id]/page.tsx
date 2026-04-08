import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { PageShell } from "../../../../../../components/ui";
import { adminApi } from "../../../../../../lib/adminServer";
import { BlogPostForm, type BlogPostInitial } from "../../BlogPostForm";

type AdminPost = {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  featuredImage: string | null;
  author: string;
  published: boolean;
  publishedAt: string | null;
  category: { name: string; slug: string };
  tags: string[];
  seoTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  keywords: string | null;
};

function toInitial(p: AdminPost): BlogPostInitial {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    content: p.content,
    category: p.category,
    featuredImage: p.featuredImage,
    author: p.author,
    published: p.published,
    publishedAt: p.publishedAt,
    tags: p.tags,
    seoTitle: p.seoTitle,
    metaDescription: p.metaDescription,
    ogImage: p.ogImage,
    keywords: p.keywords
  };
}

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let post: AdminPost;
  let categories: { id: string; name: string; slug: string }[];
  try {
    const [pRes, cRes] = await Promise.all([
      adminApi<{ post: AdminPost }>(`/v1/admin/blog/posts/${encodeURIComponent(id)}`),
      adminApi<{ categories: { id: string; name: string; slug: string }[] }>("/v1/admin/blog/categories")
    ]);
    if (!pRes.post) notFound();
    post = pRes.post;
    categories = cRes.categories || [];
  } catch {
    notFound();
  }

  return (
    <PageShell title="Edit article" subtitle={post.title}>
      <BlogPostForm categories={categories} initial={toInitial(post)} />
    </PageShell>
  );
}
