"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { backendBaseUrl } from "../../../../services/api";
import { setRefCode } from "../../../../wallet/referral";

export default function AmbassadorRefCapturePage() {
  const params = useParams();
  const router = useRouter();
  const username = String(params?.username || "");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setErr("Invalid link");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${backendBaseUrl()}/v1/ambassador/resolve/${encodeURIComponent(username)}`);
        const data = (await res.json()) as { ok?: boolean; refAddress?: string };
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.refAddress) {
          setErr("Ambassador not found");
          return;
        }
        setRefCode(data.refAddress);
        router.replace(`/?ref=${encodeURIComponent(data.refAddress)}`);
      } catch {
        if (!cancelled) setErr("Could not resolve ambassador");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, router]);

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      {err ? (
        <p className="text-center text-sm text-red-300">{err}</p>
      ) : (
        <p className="text-center text-sm text-white/60">Joining Lidex via ambassador @{username}…</p>
      )}
    </main>
  );
}
