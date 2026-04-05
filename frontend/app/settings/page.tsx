"use client";

import React, { useEffect, useState } from "react";
import { useMode } from "../../context/mode";
import { Button, Card, Grid, PageShell, Pill, Span } from "../../components/ui";
import { loadTradingPreferences, saveTradingPreferences, type TradingPreferences } from "../../lib/tradingPreferences";
import { loadUiTheme, saveUiTheme, type UiThemePreference } from "../../lib/uiPreferences";

const SLIPPAGE_PRESETS: { label: string; value: string }[] = [
  { label: "0.1%", value: "0.001" },
  { label: "0.5%", value: "0.005" },
  { label: "1%", value: "0.01" }
];

export default function SettingsPage() {
  const { mode } = useMode();
  const isCex = mode === "cex";

  const [theme, setTheme] = useState<UiThemePreference>("dark");
  const [trading, setTrading] = useState<TradingPreferences>(() => loadTradingPreferences());
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setTheme(loadUiTheme());
    setTrading(loadTradingPreferences());
  }, []);

  function persistTrading(next: TradingPreferences) {
    setTrading(next);
    saveTradingPreferences(next);
    setSavedAt(Date.now());
  }

  function persistTheme(next: UiThemePreference) {
    setTheme(next);
    saveUiTheme(next);
    setSavedAt(Date.now());
  }

  const inputStyle: React.CSSProperties = {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "white",
    width: "100%",
    maxWidth: 280
  };

  return (
    <PageShell
      title="Settings"
      subtitle="Slippage, theme, and trading preferences."
    >
      <Grid>
        <Span col={6}>
          <Card title="Preferences" right={<Pill tone="info">UI</Pill>}>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Theme</div>
                <select
                  value={theme}
                  onChange={(e) => persistTheme(e.target.value as UiThemePreference)}
                  style={inputStyle}
                >
                  <option value="dark">Dark (default)</option>
                  <option value="light">Light (beta)</option>
                </select>
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6 }}>
                  Stored in <code>localStorage</code> as <code>lidex_ui_theme_v1</code>.
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.72 }}>
                Notifications: <span style={{ opacity: 0.9 }}>On</span> (placeholder)
              </div>
            </div>
          </Card>
        </Span>

        <Span col={6}>
          <Card title="Trading defaults" right={<Pill tone="success">Swap</Pill>}>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Slippage (decimal)</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {SLIPPAGE_PRESETS.map((p) => (
                    <Button
                      key={p.value}
                      variant="secondary"
                      onClick={() => persistTrading({ ...trading, slippageDecimal: p.value })}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <input
                  value={trading.slippageDecimal}
                  onChange={(e) => setTrading({ ...trading, slippageDecimal: e.target.value })}
                  onBlur={() => persistTrading(trading)}
                  placeholder="0.005"
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6 }}>
                  Used as default on <b>/dex/swap</b> (same format as API: 0.005 = 0.5%). Saved to{" "}
                  <code>lidex_trading_v1</code>.
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Transaction deadline</div>
                <select
                  value={String(trading.deadlineMinutes)}
                  onChange={(e) =>
                    persistTrading({ ...trading, deadlineMinutes: Number(e.target.value) })
                  }
                  style={inputStyle}
                >
                  {[5, 10, 15, 20, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Gas preference</div>
                <select
                  value={trading.gasPreference}
                  onChange={(e) =>
                    persistTrading({
                      ...trading,
                      gasPreference: e.target.value === "fast" ? "fast" : "standard"
                    })
                  }
                  style={inputStyle}
                >
                  <option value="standard">Standard</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setTrading(loadTradingPreferences());
                  setSavedAt(null);
                }}
              >
                Reload from storage
              </Button>
            </div>
          </Card>
        </Span>

        {savedAt ? (
          <Span col={12}>
            <div style={{ fontSize: 12, opacity: 0.72 }}>Last saved: {new Date(savedAt).toLocaleTimeString()}</div>
          </Span>
        ) : null}

        {isCex ? (
          <Span col={12}>
            <Card title="Account management (CEX only)" right={<Pill tone="success">CEX</Pill>}>
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                Placeholder for:
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, opacity: 0.9 }}>
                  <li>KYC / identity</li>
                  <li>Security (2FA)</li>
                  <li>API keys</li>
                  <li>Session management</li>
                </ul>
              </div>
            </Card>
          </Span>
        ) : null}
      </Grid>
    </PageShell>
  );
}
