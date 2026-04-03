/** Mirrors backend `inPresaleWindow` — client uses live clock for countdown / buy gating. */
export function presaleWindowOpen(
  startAtMs: number | null | undefined,
  endAtMs: number | null | undefined,
  nowMs: number = Date.now()
): boolean {
  const startAt = startAtMs ?? null;
  const endAt = endAtMs ?? null;
  if (startAt == null && endAt == null) return true;
  if (startAt != null && nowMs < startAt) return false;
  if (endAt != null && nowMs > endAt) return false;
  return true;
}

export function formatCountdown(remainingMs: number): string {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "0s";
  const s = Math.floor(remainingMs / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
