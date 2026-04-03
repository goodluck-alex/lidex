const THEME_KEY = "lidex_ui_theme_v1";

export type UiThemePreference = "dark" | "light";

export function loadUiTheme(): UiThemePreference {
  if (typeof window === "undefined") return "dark";
  const v = window.localStorage.getItem(THEME_KEY);
  return v === "light" ? "light" : "dark";
}

export function saveUiTheme(theme: UiThemePreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.lidexTheme = theme;
}

export function applyStoredThemeToDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.lidexTheme = loadUiTheme();
}
