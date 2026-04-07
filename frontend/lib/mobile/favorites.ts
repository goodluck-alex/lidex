const KEY = "lidex_mobile_favorites";

export function readFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const a = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(a) ? a.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(coinId: string): boolean {
  const cur = readFavoriteIds();
  const on = cur.includes(coinId);
  const next = on ? cur.filter((id) => id !== coinId) : [...cur, coinId];
  localStorage.setItem(KEY, JSON.stringify(next));
  return !on;
}

export function isFavorite(coinId: string): boolean {
  return readFavoriteIds().includes(coinId);
}
