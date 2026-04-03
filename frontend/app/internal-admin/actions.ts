"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminApi } from "../../lib/adminServer";
import { INTERNAL_ADMIN_COOKIE, signInternalAdminSession } from "../../lib/internalAdminSession";

export type LoginState = { error: string | null };

export async function loginFormAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") || "");
  const nextPath = String(formData.get("next") || "/internal-admin");
  const adminKey = String(process.env.ADMIN_API_KEY || "").trim();
  if (!adminKey) {
    return { error: "ADMIN_API_KEY is not set on this Next.js server" };
  }

  const ui = String(process.env.INTERNAL_ADMIN_UI_PASSWORD || "").trim();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !ui) {
    return { error: "INTERNAL_ADMIN_UI_PASSWORD must be set in production" };
  }

  if (ui && password !== ui) {
    return { error: "Invalid password" };
  }

  if (ui) {
    const token = await signInternalAdminSession(ui);
    const store = await cookies();
    store.set(INTERNAL_ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
  }

  const dest = nextPath.startsWith("/internal-admin") ? nextPath : "/internal-admin";
  redirect(dest);
}

export async function logoutInternalAdmin() {
  const store = await cookies();
  store.delete(INTERNAL_ADMIN_COOKIE);
  redirect("/internal-admin/login");
}

/** Phase G — optional `ADMIN_CONSOLE_APPROVER_KEY` sends `X-Admin-Approver-Key` (second party). */
export async function patchListingApplication(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const decision = String(formData.get("decision") || "").trim().toLowerCase();
  const noteRaw = formData.get("note");
  const note = noteRaw == null || noteRaw === "" ? null : String(noteRaw).trim().slice(0, 4000);
  const ticketRaw = formData.get("supportTicket");
  const ticket =
    ticketRaw == null || String(ticketRaw).trim() === ""
      ? undefined
      : String(ticketRaw).trim().slice(0, 128);
  const hdrs: Record<string, string> = {};
  if (ticket) hdrs["X-Support-Ticket-Id"] = ticket;
  const approver = String(process.env.ADMIN_CONSOLE_APPROVER_KEY || "").trim();
  if (approver) hdrs["X-Admin-Approver-Key"] = approver;

  await adminApi(`/v1/admin/listings/applications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: hdrs,
    body: JSON.stringify({ decision, note })
  });
  revalidatePath("/internal-admin/listings");
}

export async function upsertDexPairActivation(formData: FormData) {
  const symbol = String(formData.get("symbol") || "").trim();
  const activeRaw = formData.get("active");
  const active = activeRaw === "on" || activeRaw === "true";
  const noteRaw = formData.get("note");
  const note = noteRaw == null || noteRaw === "" ? null : String(noteRaw).trim().slice(0, 4000);
  await adminApi("/v1/admin/dex-pairs/activations", {
    method: "POST",
    body: JSON.stringify({ symbol, active, note })
  });
  revalidatePath("/internal-admin/dex-pairs");
}

export async function deleteDexPairActivation(formData: FormData) {
  const symbol = String(formData.get("symbol") || "").trim();
  const q = new URLSearchParams({ symbol });
  await adminApi(`/v1/admin/dex-pairs/activations?${q.toString()}`, { method: "DELETE" });
  revalidatePath("/internal-admin/dex-pairs");
}

export async function createLaunchpadSale(formData: FormData) {
  const body = {
    slug: String(formData.get("slug") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    offerAsset: String(formData.get("offerAsset") || "").trim(),
    payAsset: String(formData.get("payAsset") || "").trim(),
    pricePayPerToken: String(formData.get("pricePayPerToken") || "").trim(),
    totalOfferTokens: String(formData.get("totalOfferTokens") || "").trim(),
    minTierRank: Number(formData.get("minTierRank") || 0) || 0,
    status: String(formData.get("status") || "draft").trim().toLowerCase(),
    summary: formData.get("summary") ? String(formData.get("summary")).trim().slice(0, 8000) : null,
    startsAt: formData.get("startsAt") ? String(formData.get("startsAt")) : undefined,
    endsAt: formData.get("endsAt") ? String(formData.get("endsAt")) : undefined
  };
  await adminApi("/v1/admin/launchpad/sales", { method: "POST", body: JSON.stringify(body) });
  revalidatePath("/internal-admin/launchpad");
}

export async function patchLaunchpadSale(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const patch: Record<string, unknown> = {};
  if (formData.get("title") !== null) patch.title = String(formData.get("title") || "").trim();
  if (formData.get("status") !== null) patch.status = String(formData.get("status") || "").trim().toLowerCase();
  if (formData.get("summary") !== null) {
    const s = formData.get("summary");
    patch.summary = s === "" ? null : String(s).trim().slice(0, 8000);
  }
  if (formData.get("startsAt") !== null) {
    const s = formData.get("startsAt");
    patch.startsAt = s === "" ? null : String(s);
  }
  if (formData.get("endsAt") !== null) {
    const s = formData.get("endsAt");
    patch.endsAt = s === "" ? null : String(s);
  }
  if (formData.get("minTierRank") !== null) patch.minTierRank = Number(formData.get("minTierRank") || 0) || 0;
  if (formData.get("pricePayPerToken") !== null) {
    patch.pricePayPerToken = String(formData.get("pricePayPerToken") || "").trim();
  }
  await adminApi(`/v1/admin/launchpad/sales/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
  revalidatePath("/internal-admin/launchpad");
}

export async function createLiqMiningCampaign(formData: FormData) {
  const body: Record<string, unknown> = {
    multiplierBps: Math.trunc(Number(formData.get("multiplierBps") || NaN)),
    poolSymbol: formData.get("poolSymbol") ? String(formData.get("poolSymbol")).trim() : null,
    label: formData.get("label") ? String(formData.get("label")).trim().slice(0, 200) : null,
    status: String(formData.get("status") || "active").trim().toLowerCase(),
    startsAt: formData.get("startsAt") ? String(formData.get("startsAt")) : undefined,
    endsAt: formData.get("endsAt") ? String(formData.get("endsAt")) : undefined
  };
  await adminApi("/v1/admin/liq-mining/campaigns", { method: "POST", body: JSON.stringify(body) });
  revalidatePath("/internal-admin/liq-mining");
}

export async function patchLiqMiningCampaign(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const patch: Record<string, unknown> = {};
  if (formData.get("label") !== null) {
    const s = formData.get("label");
    patch.label = s === "" ? null : String(s).trim().slice(0, 200);
  }
  if (formData.get("status") !== null) patch.status = String(formData.get("status") || "").trim().toLowerCase();
  if (formData.get("multiplierBps") !== null) {
    patch.multiplierBps = Math.trunc(Number(formData.get("multiplierBps") || NaN));
  }
  if (formData.get("startsAt") !== null) {
    const s = formData.get("startsAt");
    patch.startsAt = s === "" ? null : String(s);
  }
  if (formData.get("endsAt") !== null) {
    const s = formData.get("endsAt");
    patch.endsAt = s === "" ? null : String(s);
  }
  await adminApi(`/v1/admin/liq-mining/campaigns/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
  revalidatePath("/internal-admin/liq-mining");
}

export async function createGovSignal(formData: FormData) {
  const body = {
    slug: String(formData.get("slug") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    powerBasis: String(formData.get("powerBasis") || "").trim(),
    description: formData.get("description") ? String(formData.get("description")).slice(0, 20000) : null,
    status: String(formData.get("status") || "draft").trim().toLowerCase(),
    startsAt: formData.get("startsAt") ? String(formData.get("startsAt")) : undefined,
    endsAt: formData.get("endsAt") ? String(formData.get("endsAt")) : undefined
  };
  await adminApi("/v1/admin/governance/signals", { method: "POST", body: JSON.stringify(body) });
  revalidatePath("/internal-admin/governance");
}

export async function patchGovSignal(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const patch: Record<string, unknown> = {};
  if (formData.get("title") !== null) patch.title = String(formData.get("title") || "").trim();
  if (formData.get("description") !== null) {
    const s = formData.get("description");
    patch.description = s === "" ? null : String(s).slice(0, 20000);
  }
  if (formData.get("status") !== null) patch.status = String(formData.get("status") || "").trim().toLowerCase();
  if (formData.get("powerBasis") !== null) patch.powerBasis = String(formData.get("powerBasis") || "").trim();
  if (formData.get("startsAt") !== null) {
    const s = formData.get("startsAt");
    patch.startsAt = s === "" ? null : String(s);
  }
  if (formData.get("endsAt") !== null) {
    const s = formData.get("endsAt");
    patch.endsAt = s === "" ? null : String(s);
  }
  await adminApi(`/v1/admin/governance/signals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
  revalidatePath("/internal-admin/governance");
}
