"use client";

import { useEffect } from "react";
import { applyStoredThemeToDocument } from "../lib/uiPreferences";

/** Applies `lidex_ui_theme_v1` from localStorage on load (see Settings). */
export function ThemeEffect() {
  useEffect(() => {
    applyStoredThemeToDocument();
  }, []);
  return null;
}
