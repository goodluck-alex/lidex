"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { TopNav } from "./TopNav";

/**
 * Hides desktop TopNav on `/m/*` so the mobile app shell is standalone.
 * The marketing site at `/` keeps the normal header.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mobileApp = pathname === "/m" || (pathname?.startsWith("/m/") ?? false);

  return (
    <>
      {!mobileApp ? <TopNav /> : null}
      {children}
    </>
  );
}
