import { LoginClient } from "./LoginClient";

export default async function InternalAdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const raw = sp?.next;
  const nextPath =
    typeof raw === "string" && raw.startsWith("/internal-admin") ? raw : "/internal-admin";
  const requirePassword =
    process.env.NODE_ENV === "production" ||
    !!String(process.env.INTERNAL_ADMIN_UI_PASSWORD || "").trim();

  return <LoginClient nextPath={nextPath} requirePassword={requirePassword} />;
}
