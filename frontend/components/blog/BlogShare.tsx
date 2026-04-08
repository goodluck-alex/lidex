"use client";

import { useCallback, useState } from "react";

export function BlogShare({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [url]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-6">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Share</span>
      <a
        href={`https://twitter.com/intent/tweet?url=${encUrl}&text=${encTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/90 hover:border-[#2979ff]/40"
      >
        X
      </a>
      <a
        href={`https://t.me/share/url?url=${encUrl}&text=${encTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/90 hover:border-[#2979ff]/40"
      >
        Telegram
      </a>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/90 hover:border-[#00c896]/40"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
