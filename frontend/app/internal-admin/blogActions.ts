"use server";

import { revalidatePath } from "next/cache";
import { adminApi } from "../../lib/adminServer";

export async function createBlogPostAction(body: Record<string, unknown>) {
  await adminApi("/v1/admin/blog/posts", {
    method: "POST",
    body: JSON.stringify(body)
  });
  revalidatePath("/blog");
  revalidatePath("/internal-admin/blog");
}

export async function updateBlogPostAction(id: string, body: Record<string, unknown>) {
  await adminApi(`/v1/admin/blog/posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
  revalidatePath("/blog");
  revalidatePath("/internal-admin/blog");
  if (typeof body.slug === "string") {
    revalidatePath(`/blog/${body.slug}`);
  }
}

export async function deleteBlogPostAction(id: string) {
  await adminApi(`/v1/admin/blog/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
  revalidatePath("/blog");
  revalidatePath("/internal-admin/blog");
}
