import { NextResponse } from "next/server";
import Parser from "rss-parser";

/** Public RSS used server-side only; not shown in the Lidex UI. */
const FEED_URL = "https://decrypt.co/feed";

export type NewsFeedItem = {
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  image: string | null;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function firstImgSrc(html: string | undefined): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

export async function GET() {
  try {
    const parser = new Parser({
      headers: {
        "User-Agent": "LidexExchange/1.0 (crypto-news; +https://lidex.com)"
      }
    });
    const feed = await parser.parseURL(FEED_URL);
    const raw = feed.items || [];
    const items: NewsFeedItem[] = raw.slice(0, 8).map((item) => {
      const encoded = (item as Record<string, string | undefined>)["content:encoded"];
      const htmlBody = encoded || item.content || "";
      const summary = stripHtml(item.contentSnippet || item.summary || htmlBody).slice(0, 240);
      const enc = item.enclosure as { url?: string; type?: string } | undefined;
      const enclosureImg =
        enc?.url && typeof enc.type === "string" && enc.type.startsWith("image/") ? enc.url : null;
      return {
        title: item.title?.trim() || "Untitled",
        link: item.link || "#",
        summary: summary.length > 0 ? summary : "Read the full story.",
        publishedAt: item.isoDate || item.pubDate || null,
        image: enclosureImg || firstImgSrc(htmlBody)
      };
    });

    return NextResponse.json(
      {
        ok: true as const,
        items,
        updatedAt: new Date().toISOString()
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
        }
      }
    );
  } catch (e) {
    console.error("[news/feed]", e);
    return NextResponse.json(
      { ok: false as const, error: "Failed to load news", items: [] as NewsFeedItem[] },
      { status: 502 }
    );
  }
}
