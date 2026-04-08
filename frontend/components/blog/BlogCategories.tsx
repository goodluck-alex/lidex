"use client";

type Tab = "all" | "growth" | "education" | "marketing";

export function BlogCategories({
  active,
  onChange
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "growth", label: "Growth" },
    { id: "education", label: "Education" },
    { id: "marketing", label: "Marketing" }
  ];

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-white/[0.06] bg-[#0b0f1a]/95 px-4 py-2 backdrop-blur-md sm:-mx-0 sm:px-0">
      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              active === t.id ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
