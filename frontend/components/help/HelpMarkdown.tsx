"use client";

import React from "react";

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(s: string) {
  // Very small inline syntax: **bold** and `code`
  let out = escapeHtml(s);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/`(.+?)`/g, "<code>$1</code>");
  return out;
}

export function HelpMarkdown({ md }: { md: string }) {
  const lines = String(md || "").split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;

  const pushPara = (text: string) => {
    const t = text.trim();
    if (!t) return;
    blocks.push(
      <p
        key={`p-${blocks.length}`}
        className="mt-3 text-sm leading-relaxed text-white/75"
        dangerouslySetInnerHTML={{ __html: renderInline(t) }}
      />
    );
  };

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const line = raw.trimEnd();

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      const t = line.slice(3).trim();
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="mt-6 text-base font-bold text-white">
          {t}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] || "").trim().startsWith("- ")) {
        items.push((lines[i] || "").trim().slice(2));
        i++;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/75">
          {items.map((it, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
          ))}
        </ul>
      );
      continue;
    }

    // paragraph: collect until blank line
    const para: string[] = [];
    while (i < lines.length && (lines[i] || "").trim() !== "") {
      para.push((lines[i] || "").trim());
      i++;
    }
    pushPara(para.join(" "));
  }

  return <div className="help-prose">{blocks}</div>;
}

