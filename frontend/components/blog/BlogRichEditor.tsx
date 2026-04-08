"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false, loading: () => <p className="text-sm text-white/50">Loading editor…</p> });

export function BlogRichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["code-block"],
        ["clean"]
      ]
    }),
    []
  );

  return (
    <div className="blog-quill rounded-lg border border-white/15 bg-black/30 text-white [&_.ql-container]:min-h-[220px] [&_.ql-editor]:min-h-[220px] [&_.ql-stroke]:stroke-white/80 [&_.ql-toolbar]:border-white/15 [&_.ql-toolbar]:bg-white/[0.04]">
      <ReactQuill theme="snow" value={value} onChange={onChange} modules={modules} />
    </div>
  );
}
