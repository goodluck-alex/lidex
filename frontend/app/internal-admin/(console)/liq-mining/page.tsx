import type { CSSProperties } from "react";
import { adminApi } from "../../../../lib/adminServer";
import { PageShell, Card } from "../../../../components/ui";
import { createLiqMiningCampaign, patchLiqMiningCampaign } from "../../actions";

type Campaign = {
  id: string;
  poolSymbol: string | null;
  label: string | null;
  multiplierBps: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
};

export default async function InternalAdminLiqMiningPage() {
  let campaigns: Campaign[] = [];
  let enabled = true;
  let err: string | null = null;
  try {
    const data = await adminApi<{ enabled?: boolean; campaigns: Campaign[] }>("/v1/admin/liq-mining/campaigns");
    campaigns = data.campaigns || [];
    enabled = data.enabled !== false;
  } catch (e: unknown) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  if (err) {
    return (
      <PageShell title="Liquidity mining">
        <Card tone="danger" title="Error">
          {err}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Liquidity mining — campaigns"
      subtitle={enabled ? "Create and patch campaigns." : "Feature disabled on backend."}
    >
      <Card title="Create campaign">
        <form action={createLiqMiningCampaign} style={{ display: "grid", gap: 8, maxWidth: 480 }}>
          <label style={lbl}>
            multiplierBps (required)
            <input name="multiplierBps" type="number" required style={inp} placeholder="10000 = 1×" />
          </label>
          <label style={lbl}>
            poolSymbol (optional)
            <input name="poolSymbol" style={inp} />
          </label>
          <label style={lbl}>
            label (optional)
            <input name="label" style={inp} />
          </label>
          <label style={lbl}>
            status
            <select name="status" defaultValue="active" style={inp}>
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
          </label>
          <label style={lbl}>
            startsAt (optional)
            <input name="startsAt" style={inp} />
          </label>
          <label style={lbl}>
            endsAt (optional)
            <input name="endsAt" style={inp} />
          </label>
          <button type="submit" style={btnPrimary}>
            Create
          </button>
        </form>
      </Card>

      <Card title={`${campaigns.length} campaigns`}>
        <div style={{ display: "grid", gap: 16 }}>
          {campaigns.map((c) => (
            <form
              key={c.id}
              action={patchLiqMiningCampaign}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 8
              }}
            >
              <input type="hidden" name="id" value={c.id} />
              <div style={{ fontWeight: 700 }}>
                {c.label || c.poolSymbol || "campaign"}{" "}
                <span style={{ opacity: 0.65, fontWeight: 500 }}>({c.id})</span>
              </div>
              <label style={lbl}>
                label
                <input name="label" defaultValue={c.label ?? ""} style={inp} />
              </label>
              <label style={lbl}>
                status
                <select name="status" defaultValue={c.status} style={inp}>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                </select>
              </label>
              <label style={lbl}>
                multiplierBps
                <input name="multiplierBps" type="number" defaultValue={c.multiplierBps} style={inp} />
              </label>
              <label style={lbl}>
                startsAt
                <input name="startsAt" defaultValue={c.startsAt ?? ""} style={inp} />
              </label>
              <label style={lbl}>
                endsAt
                <input name="endsAt" defaultValue={c.endsAt ?? ""} style={inp} />
              </label>
              <button type="submit" style={btnPrimary}>
                Patch
              </button>
            </form>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}

const lbl: CSSProperties = { fontSize: 13 };
const inp: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: 8,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "white"
};
const btnPrimary: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid rgba(0,200,150,0.35)",
  background: "rgba(0,200,150,0.2)",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
  justifySelf: "start"
};
