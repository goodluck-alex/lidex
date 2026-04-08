import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { INTERNAL_ADMIN_COOKIE, verifyInternalAdminCookie } from "./lib/internalAdminSession";

const MODE_COOKIE = "lidex_mode";
const ONE_YEAR_S = 60 * 60 * 24 * 365;
const CEX_ONLY_PREFIXES = ["/cex", "/trade", "/staking", "/launchpad", "/governance", "/margin"];

function isCexOnlyPath(pathname: string) {
  return CEX_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /** Spec alias: `/admin/*` → `/internal-admin/*` (same cookie-gated console). */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = req.nextUrl.clone();
    const rest = pathname.slice("/admin".length);
    url.pathname = `/internal-admin${rest}`;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/internal-admin")) {
    const isLogin =
      pathname === "/internal-admin/login" || pathname.startsWith("/internal-admin/login/");
    if (!isLogin) {
      const ok = await verifyInternalAdminCookie(req.cookies.get(INTERNAL_ADMIN_COOKIE)?.value);
      if (!ok) {
        const url = req.nextUrl.clone();
        url.pathname = "/internal-admin/login";
        url.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // Legacy route redirects (keep old links working)
  if (pathname === "/swap" || pathname.startsWith("/swap/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/swap/, "/dex/swap");
    return NextResponse.redirect(url);
  }
  if (pathname === "/trade" || pathname.startsWith("/trade/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/trade/, "/cex/trade");
    return NextResponse.redirect(url);
  }

  // Keep `lidex_mode` aligned with URL section so API `X-Lidex-Mode` (from cookie) matches surface.
  if (pathname === "/dex" || pathname.startsWith("/dex/")) {
    const res = NextResponse.next();
    res.cookies.set(MODE_COOKIE, "dex", { path: "/", maxAge: ONE_YEAR_S, sameSite: "lax" });
    return res;
  }
  if (pathname === "/cex" || pathname.startsWith("/cex/")) {
    const res = NextResponse.next();
    res.cookies.set(MODE_COOKIE, "cex", { path: "/", maxAge: ONE_YEAR_S, sameSite: "lax" });
    return res;
  }

  if (!isCexOnlyPath(pathname)) return NextResponse.next();

  const mode = req.cookies.get(MODE_COOKIE)?.value || "dex";
  if (mode === "cex") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/dex/swap";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/internal-admin/:path*",
    "/dex/:path*",
    "/swap/:path*",
    "/trade/:path*",
    "/cex/:path*",
    "/staking/:path*",
    "/launchpad/:path*",
    "/governance",
    "/governance/:path*",
    "/margin",
    "/margin/:path*"
  ]
};

