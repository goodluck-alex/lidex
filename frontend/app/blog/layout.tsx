import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Lidex Exchange",
  description: "Lidex Exchange blog — growth, education, marketing, and product updates.",
  openGraph: {
    title: "Lidex Blog",
    description: "Growth, education, and announcements from Lidex Exchange."
  }
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
