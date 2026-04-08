import Link from "next/link";
import { adminApi } from "../../../../lib/adminServer";

export const dynamic = "force-dynamic";
import { Card, PageShell } from "../../../../components/ui";

type AdminPost = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  category: { name: string; slug: string };
  updatedAt: string;
};

export default async function InternalAdminBlogPage() {
  let posts: AdminPost[] = [];
  let categories: { id: string; name: string; slug: string }[] = [];
  let err: string | null = null;
  try {
    const [plist, clist] = await Promise.all([
      adminApi<{ posts: AdminPost[] }>("/v1/admin/blog/posts?limit=200"),
      adminApi<{ categories: { id: string; name: string; slug: string }[] }>("/v1/admin/blog/categories")
    ]);
    posts = plist.posts || [];
    categories = clist.categories || [];
  } catch (e: unknown) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  if (err) {
    return (
      <PageShell title="Blog" subtitle="Articles">
        <Card tone="danger" title="Error">
          {err}
        </Card>
      </PageShell>
    );
  }

  const drafts = posts.filter((p) => !p.published);
  const published = posts.filter((p) => p.published);

  return (
    <PageShell
      title="Blog"
      subtitle="Create, edit, and publish articles. Public blog lives at /blog. Admin alias: /admin/blog → /internal-admin/blog."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/internal-admin/blog/new"
          className="inline-flex rounded-lg border border-[#00c896]/40 bg-[#00c896]/15 px-3 py-2 text-sm font-semibold text-white hover:bg-[#00c896]/25"
        >
          Add new article
        </Link>
        <Link href="/blog" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#7aa7ff] underline">
          View public blog →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card title="Categories">
            <ul className="space-y-2 text-sm text-white/80">
              {categories.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold text-white">{c.name}</span>
                  <span className="ml-2 font-mono text-xs text-white/45">/{c.slug}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title={`All articles (${posts.length})`}>
            <PostTable posts={posts} />
          </Card>
          <Card title={`Drafts (${drafts.length})`}>
            {drafts.length === 0 ? (
              <p className="text-sm text-white/50">No drafts.</p>
            ) : (
              <PostTable posts={drafts} />
            )}
          </Card>
          <Card title={`Published (${published.length})`}>
            {published.length === 0 ? (
              <p className="text-sm text-white/50">Nothing published yet.</p>
            ) : (
              <PostTable posts={published} />
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function PostTable({ posts }: { posts: AdminPost[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            <th className="py-2 pr-2">Title</th>
            <th className="py-2 pr-2">Category</th>
            <th className="py-2 pr-2">Status</th>
            <th className="py-2 pr-2">Updated</th>
            <th className="py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id} className="border-b border-white/[0.06]">
              <td className="py-2 pr-2 font-medium text-white">{p.title}</td>
              <td className="py-2 pr-2 text-white/70">{p.category.name}</td>
              <td className="py-2 pr-2">{p.published ? "Live" : "Draft"}</td>
              <td className="py-2 pr-2 text-white/45">{new Date(p.updatedAt).toLocaleString()}</td>
              <td className="py-2">
                <Link href={`/internal-admin/blog/edit/${p.id}`} className="font-semibold text-[#7aa7ff] hover:underline">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
