import DOMPurify from "isomorphic-dompurify";

const proseClass =
  "blog-article max-w-none text-white/85 [&_a]:text-[#7aa7ff] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-[#2979ff]/50 [&_blockquote]:pl-4 [&_blockquote]:text-white/70 [&_code]:rounded [&_code]:bg-black/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p]:leading-relaxed [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/50 [&_pre]:p-4 [&_pre]:text-sm [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6";

export function BlogArticleBody({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"]
  });
  return <div className={proseClass} dangerouslySetInnerHTML={{ __html: clean }} />;
}
