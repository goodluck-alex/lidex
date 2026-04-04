import type { CSSProperties } from "react";
import { adminApi } from "../../../../lib/adminServer";
import { PageShell, Card } from "../../../../components/ui";
import { deleteDexPairActivation, upsertDexPairActivation } from "../../actions";

type Activation = {
  id: string;
  symbol: string;
  active: boolean;
  note: string | null;
};

export default async function InternalAdminDexPairsPage() {
  let activations: Activation[] = [];
  let err: string | null = null;
  try {
    const data = await adminApi<{ activations: Activation[] }>("/v1/admin/dex-pairs/activations");
    activations = data.activations || [];
  } catch (e: unknown) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  if (err) {
    return (
      <PageShell title="DEX pair activations">
        <Card tone="danger" title="Error">
          {err}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="DEX pair activations" subtitle="Upsert or delete rows (same as admin API).">
      <Card title="Upsert">
        <form action={upsertDexPairActivation} style={{ display: "grid", gap: 8, maxWidth: 480 }}>
          <label style={{ fontSize: 13 }}>
            Symbol (e.g. LDX/USDT)
            <input name="symbol" required style={inputStyle} />
          </label>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="active" defaultChecked />
            Active (uncheck to set inactive)
          </label>
          <label style={{ fontSize: 13 }}>
            Note (optional)
            <input name="note" style={inputStyle} />
          </label>
          <button type="submit" style={submitStyle}>
            Save
          </button>
        </form>
      </Card>

      <Card title={`${activations.length} activations`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "8px 6px" }}>Symbol</th>
                <th style={{ padding: "8px 6px" }}>Active</th>
                <th style={{ padding: "8px 6px" }}>Note</th>
                <th style={{ padding: "8px 6px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activations.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "8px 6px", fontWeight: 650 }}>{r.symbol}</td>
                  <td style={{ padding: "8px 6px" }}>{r.active ? "yes" : "no"}</td>
                  <td style={{ padding: "8px 6px", opacity: 0.85, maxWidth: 280 }}>{r.note || "—"}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <form action={deleteDexPairActivation} style={{ display: "inline" }}>
                      <input type="hidden" name="symbol" value={r.symbol} />
                      <button type="submit" style={dangerBtn}>
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: 8,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "white"
};

const submitStyle: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid rgba(0,200,150,0.35)",
  background: "rgba(0,200,150,0.2)",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
  justifySelf: "start"
};

const dangerBtn: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,100,100,0.35)",
  background: "rgba(255,80,80,0.12)",
  color: "#ffb4b4",
  cursor: "pointer",
  fontSize: 12
};
