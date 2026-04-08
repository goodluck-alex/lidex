import { PageShell } from "../../../../../components/ui";

export const dynamic = "force-dynamic";
import { adminApi } from "../../../../../lib/adminServer";
import { BlogPostForm } from "../BlogPostForm";

export default async function NewBlogPostPage() {
  const data = await adminApi<{ categories: { id: string; name: string; slug: string }[] }>(
    "/v1/admin/blog/categories"
  );
  return (
    <PageShell title="New article" subtitle="Draft or publish — content is stored as safe HTML from the editor.">
      <BlogPostForm categories={data.categories} initial={null} />
    </PageShell>
  );
}
