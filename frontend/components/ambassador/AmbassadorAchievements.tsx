export type AchievementRow = { id: string; title: string; icon: string; unlocked: boolean };

export function AmbassadorAchievements({ items }: { items: AchievementRow[] }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <h2 className="text-sm font-bold text-white">Achievements</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((a) => (
          <li
            key={a.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
              a.unlocked
                ? "border-[#00c896]/35 bg-[#00c896]/10 text-white"
                : "border-white/[0.06] bg-black/20 text-white/45"
            }`}
          >
            <span className="text-xl" aria-hidden>
              {a.icon}
            </span>
            <span className="font-medium">{a.title}</span>
            {a.unlocked ? <span className="ml-auto text-xs font-bold text-[#00c896]">Unlocked</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
