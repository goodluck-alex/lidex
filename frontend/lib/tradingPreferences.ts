const STORAGE_KEY = "lidex_trading_v1";

export type TradingPreferences = {
  /** Slippage as decimal fraction, e.g. 0.005 = 0.5% (matches swap API). */
  slippageDecimal: string;
  /** Transaction deadline in minutes (for future router / UI copy). */
  deadlineMinutes: number;
  /** `standard` | `fast` — informational until gas UI is wired. */
  gasPreference: "standard" | "fast";
};

const DEFAULTS: TradingPreferences = {
  slippageDecimal: "0.005",
  deadlineMinutes: 20,
  gasPreference: "standard",
};

function safeParse(raw: string | null): TradingPreferences {
  if (!raw) return { ...DEFAULTS };
  try {
    const o = JSON.parse(raw) as Partial<TradingPreferences>;
    const slippageDecimal =
      typeof o.slippageDecimal === "string" && o.slippageDecimal.length > 0 ? o.slippageDecimal : DEFAULTS.slippageDecimal;
    const deadlineMinutes =
      typeof o.deadlineMinutes === "number" && o.deadlineMinutes > 0 && o.deadlineMinutes <= 180
        ? o.deadlineMinutes
        : DEFAULTS.deadlineMinutes;
    const gasPreference = o.gasPreference === "fast" ? "fast" : "standard";
    return { slippageDecimal, deadlineMinutes, gasPreference };
  } catch {
    return { ...DEFAULTS };
  }
}

export function loadTradingPreferences(): TradingPreferences {
  if (typeof window === "undefined") return { ...DEFAULTS };
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function saveTradingPreferences(next: Partial<TradingPreferences>) {
  if (typeof window === "undefined") return;
  const cur = loadTradingPreferences();
  const merged = { ...cur, ...next };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent("lidex-trading-prefs-changed", { detail: merged }));
}

export function tradingPreferencesDefaults(): TradingPreferences {
  return { ...DEFAULTS };
}
