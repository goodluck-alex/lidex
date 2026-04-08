const { prisma } = require("../../lib/prisma");

const DEFAULT_CATEGORIES = [
  { name: "Growth", slug: "growth" },
  { name: "Education", slug: "education" },
  { name: "Marketing", slug: "marketing" },
];

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function computeReadingMinutes(html) {
  const text = String(html || "").replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const listInclude = {
  category: true,
  tags: { include: { tag: true } },
};

function mapPublicListItem(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    featuredImage: row.featuredImage,
    author: row.author,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    readingMinutes: row.readingMinutes,
    category: { name: row.category.name, slug: row.category.slug },
    tags: row.tags.map((t) => t.tag.name),
  };
}

function mapPublicDetail(row) {
  return {
    ...mapPublicListItem(row),
    content: row.content,
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
    ogImage: row.ogImage,
    keywords: row.keywords,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureCategories() {
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.blogCategory.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug },
      update: { name: c.name },
    });
  }
}

async function listCategoriesPublic() {
  await ensureCategories();
  const rows = await prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
  return { ok: true, categories: rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug })) };
}

async function listPostsPublic(q) {
  await ensureCategories();
  const limit = Math.min(24, Math.max(1, Number(q?.limit) || 12));
  const page = Math.max(1, Number(q?.page) || 1);
  const skip = (page - 1) * limit;
  const categorySlug = q?.category ? String(q.category).trim().toLowerCase() : "";
  const search = q?.search ? String(q.search).trim() : "";

  const where = {
    published: true,
    ...(categorySlug && categorySlug !== "all"
      ? { category: { slug: categorySlug } }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      skip,
      take: limit + 1,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: listInclude,
    }),
  ]);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    ok: true,
    items: items.map(mapPublicListItem),
    page,
    hasMore,
    total,
  };
}

async function getPostBySlugPublic(slug) {
  await ensureCategories();
  const row = await prisma.blogPost.findFirst({
    where: { slug: String(slug), published: true },
    include: listInclude,
  });
  if (!row) return { ok: false, code: "NOT_FOUND", error: "not found" };
  return { ok: true, post: mapPublicDetail(row) };
}

async function getPostBySlugWithRelatedPublic(slug) {
  const base = await getPostBySlugPublic(slug);
  if (!base.ok) return base;
  const related = await relatedPostsPublic(base.post.category.slug, base.post.id, 3);
  return { ok: true, post: base.post, related };
}

async function relatedPostsPublic(categorySlug, excludeId, take = 3) {
  const rows = await prisma.blogPost.findMany({
    where: {
      published: true,
      id: { not: excludeId },
      category: { slug: categorySlug },
    },
    orderBy: [{ publishedAt: "desc" }],
    take,
    include: listInclude,
  });
  return rows.map(mapPublicListItem);
}

async function listPostsAdmin(q) {
  await ensureCategories();
  const limit = Math.min(200, Math.max(1, Number(q?.limit) || 100));
  const published =
    q?.published === "false" || q?.drafts === "1" || q?.drafts === "true"
      ? false
      : q?.published === "true"
        ? true
        : undefined;

  const categorySlug = q?.category ? String(q.category).trim().toLowerCase() : "";

  const where = {
    ...(published === undefined ? {} : { published }),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
  };

  const rows = await prisma.blogPost.findMany({
    where,
    take: limit,
    orderBy: [{ updatedAt: "desc" }],
    include: listInclude,
  });

  return {
    ok: true,
    posts: rows.map((r) => ({
      id: r.id,
      ...mapPublicListItem(r),
      published: r.published,
      content: r.content,
      seoTitle: r.seoTitle,
      metaDescription: r.metaDescription,
      ogImage: r.ogImage,
      keywords: r.keywords,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

async function getPostAdmin(id) {
  await ensureCategories();
  const r = await prisma.blogPost.findUnique({
    where: { id: String(id) },
    include: listInclude,
  });
  if (!r) return { ok: false, code: "NOT_FOUND", error: "not found" };
  return {
    ok: true,
    post: {
      id: r.id,
      ...mapPublicDetail(r),
      published: r.published,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    },
  };
}

async function getCategoryBySlug(slug) {
  return prisma.blogCategory.findUnique({ where: { slug: String(slug) } });
}

async function syncTags(postId, tagNames) {
  const names = Array.isArray(tagNames)
    ? [...new Set(tagNames.map((t) => String(t || "").trim()).filter(Boolean))]
    : [];

  await prisma.blogPostTag.deleteMany({ where: { postId } });

  for (const name of names) {
    const tag = await prisma.blogTag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    await prisma.blogPostTag.create({
      data: { postId, tagId: tag.id },
    });
  }
}

function normalizeBody(body) {
  const title = String(body?.title || "").trim();
  let slug = slugify(body?.slug || body?.title || "");
  const description = String(body?.description || "").trim();
  const content = String(body?.content || "");
  const categorySlug = String(body?.categorySlug || body?.category || "").trim().toLowerCase();
  const featuredImage =
    body?.featuredImage == null || body?.featuredImage === ""
      ? null
      : String(body.featuredImage).trim().slice(0, 2048);
  const author = String(body?.author || "Lidex Team").trim().slice(0, 120) || "Lidex Team";
  const published = Boolean(body?.published);
  const publishedAtRaw = body?.publishedAt;
  const seoTitle = body?.seoTitle ? String(body.seoTitle).trim().slice(0, 200) : null;
  const metaDescription = body?.metaDescription
    ? String(body.metaDescription).trim().slice(0, 320)
    : null;
  const ogImage =
    body?.ogImage == null || body?.ogImage === "" ? null : String(body.ogImage).trim().slice(0, 2048);
  const keywords = body?.keywords ? String(body.keywords).trim().slice(0, 500) : null;
  const tags = body?.tags;

  let publishedAt = null;
  if (published) {
    if (publishedAtRaw) {
      const d = new Date(publishedAtRaw);
      publishedAt = Number.isNaN(d.getTime()) ? new Date() : d;
    } else {
      publishedAt = new Date();
    }
  }

  const readingMinutes = computeReadingMinutes(content);

  return {
    title,
    slug,
    description,
    content,
    categorySlug,
    featuredImage,
    author,
    published,
    publishedAt,
    seoTitle,
    metaDescription,
    ogImage,
    keywords,
    tags,
    readingMinutes,
  };
}

async function createPostAdmin(body) {
  await ensureCategories();
  const n = normalizeBody(body);
  if (!n.title) return { ok: false, code: "BAD_REQUEST", error: "title required" };
  if (!n.slug) return { ok: false, code: "BAD_REQUEST", error: "slug required" };
  if (!n.description) return { ok: false, code: "BAD_REQUEST", error: "description required" };
  if (!n.content) return { ok: false, code: "BAD_REQUEST", error: "content required" };
  if (!n.categorySlug) return { ok: false, code: "BAD_REQUEST", error: "categorySlug required" };

  const cat = await getCategoryBySlug(n.categorySlug);
  if (!cat) return { ok: false, code: "BAD_CATEGORY", error: "unknown category" };

  try {
    const post = await prisma.blogPost.create({
      data: {
        title: n.title,
        slug: n.slug,
        description: n.description,
        content: n.content,
        featuredImage: n.featuredImage,
        author: n.author,
        published: n.published,
        publishedAt: n.publishedAt,
        seoTitle: n.seoTitle,
        metaDescription: n.metaDescription,
        ogImage: n.ogImage,
        keywords: n.keywords,
        readingMinutes: n.readingMinutes,
        categoryId: cat.id,
      },
      include: listInclude,
    });
    await syncTags(post.id, n.tags);
    const full = await prisma.blogPost.findUnique({
      where: { id: post.id },
      include: listInclude,
    });
    return { ok: true, post: mapPublicDetail(full) };
  } catch (e) {
    if (e?.code === "P2002") {
      return { ok: false, code: "CONFLICT", error: "slug already exists" };
    }
    throw e;
  }
}

async function updatePostAdmin(id, body) {
  await ensureCategories();
  const existing = await prisma.blogPost.findUnique({ where: { id: String(id) } });
  if (!existing) return { ok: false, code: "NOT_FOUND", error: "not found" };

  const title = body?.title != null ? String(body.title).trim() : existing.title;
  const slug =
    body?.slug != null
      ? slugify(body.slug)
      : body?.title != null
        ? slugify(body.title)
        : existing.slug;
  const description =
    body?.description != null ? String(body.description).trim() : existing.description;
  const content = body?.content != null ? String(body.content) : existing.content;

  let categorySlug = null;
  if (body?.categorySlug != null || body?.category != null) {
    categorySlug = String(body.categorySlug || body.category).trim().toLowerCase();
  } else {
    const prevCat = await prisma.blogCategory.findUnique({ where: { id: existing.categoryId } });
    categorySlug = prevCat?.slug || "growth";
  }

  const cat = await getCategoryBySlug(categorySlug);
  if (!cat) return { ok: false, code: "BAD_CATEGORY", error: "unknown category" };

  const featuredImage =
    body?.featuredImage !== undefined
      ? body.featuredImage == null || body.featuredImage === ""
        ? null
        : String(body.featuredImage).trim().slice(0, 2048)
      : existing.featuredImage;

  const author =
    body?.author != null
      ? String(body.author).trim().slice(0, 120) || existing.author
      : existing.author;

  let published = existing.published;
  let publishedAt = existing.publishedAt;
  if (body?.published != null) {
    published = Boolean(body.published);
    if (published && !publishedAt) publishedAt = new Date();
    if (!published) publishedAt = null;
  }
  if (body?.publishedAt !== undefined && published) {
    if (body.publishedAt == null || body.publishedAt === "") {
      publishedAt = new Date();
    } else {
      const d = new Date(body.publishedAt);
      publishedAt = Number.isNaN(d.getTime()) ? new Date() : d;
    }
  }

  const seoTitle =
    body?.seoTitle !== undefined
      ? body.seoTitle == null || body.seoTitle === ""
        ? null
        : String(body.seoTitle).trim().slice(0, 200)
      : existing.seoTitle;
  const metaDescription =
    body?.metaDescription !== undefined
      ? body.metaDescription == null || body.metaDescription === ""
        ? null
        : String(body.metaDescription).trim().slice(0, 320)
      : existing.metaDescription;
  const ogImage =
    body?.ogImage !== undefined
      ? body.ogImage == null || body.ogImage === ""
        ? null
        : String(body.ogImage).trim().slice(0, 2048)
      : existing.ogImage;
  const keywords =
    body?.keywords !== undefined
      ? body.keywords == null || body.keywords === ""
        ? null
        : String(body.keywords).trim().slice(0, 500)
      : existing.keywords;

  const readingMinutes = computeReadingMinutes(content);

  if (!title) return { ok: false, code: "BAD_REQUEST", error: "title required" };
  if (!slug) return { ok: false, code: "BAD_REQUEST", error: "slug required" };
  if (!description) return { ok: false, code: "BAD_REQUEST", error: "description required" };
  if (!content) return { ok: false, code: "BAD_REQUEST", error: "content required" };

  try {
    await prisma.blogPost.update({
      where: { id: existing.id },
      data: {
        title,
        slug,
        description,
        content,
        featuredImage,
        author,
        published,
        publishedAt,
        seoTitle,
        metaDescription,
        ogImage,
        keywords,
        readingMinutes,
        categoryId: cat.id,
      },
    });
    if (body?.tags != null) {
      await syncTags(existing.id, body.tags);
    }
    const full = await prisma.blogPost.findUnique({
      where: { id: existing.id },
      include: listInclude,
    });
    return { ok: true, post: mapPublicDetail(full) };
  } catch (e) {
    if (e?.code === "P2002") {
      return { ok: false, code: "CONFLICT", error: "slug already exists" };
    }
    throw e;
  }
}

async function deletePostAdmin(id) {
  try {
    await prisma.blogPost.delete({ where: { id: String(id) } });
    return { ok: true };
  } catch (e) {
    if (e?.code === "P2025") return { ok: false, code: "NOT_FOUND", error: "not found" };
    throw e;
  }
}

module.exports = {
  ensureCategories,
  listCategoriesPublic,
  listPostsPublic,
  getPostBySlugPublic,
  getPostBySlugWithRelatedPublic,
  relatedPostsPublic,
  listPostsAdmin,
  getPostAdmin,
  createPostAdmin,
  updatePostAdmin,
  deletePostAdmin,
  slugify,
  computeReadingMinutes,
};
