import type { CSSProperties } from "react";
import { adminApi } from "../../../lib/adminServer";
import { PageShell, Card } from "../../../components/ui";
import { createGovSignal, patchGovSignal } from "../../actions";

type Proposal = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  powerBasis: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
};

export default async function InternalAdminGovernancePage() {
  let proposals: Proposal[] = [];
  let enabled = true;
  let err: string | null = null;
  try {
    const data = await adminApi<{ enabled?: boolean; proposals: Proposal[] }>("/v1/admin/governance/signals");
    proposals = data.proposals || [];
    enabled = data.enabled !== false;
  } catch (e: unknown) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  if (err) {
    return (
      <PageShell title="Governance signals">
        <Card tone="danger" title="Error">
          {err}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Governance — signal proposals"
      subtitle={enabled ? "Create and patch proposals (non-binding signals)." : "Feature disabled on backend."}
    >
      <Card title="Create proposal">
        <form action={createGovSignal} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
          <label style={lbl}>
            slug
            <input name="slug" required style={inp} />
          </label>
          <label style={lbl}>
            title
            <input name="title" required style={inp} />
          </label>
          <label style={lbl}>
            powerBasis
            <select name="powerBasis" required style={inp} defaultValue="cex_ldx_available">
              <option value="cex_ldx_available">cex_ldx_available</option>
              <option value="cex_ldx_staked">cex_ldx_staked</option>
            </select>
          </label>
          <label style={lbl}>
            status
            <select name="status" defaultValue="draft" style={inp}>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="closed">closed</option>
            </select>
          </label>
          <label style={lbl}>
            description (optional)
            <textarea name="description" rows={3} style={{ ...inp, resize: "vertical" }} />
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

      <Card title={`${proposals.length} proposals`}>
        <div style={{ display: "grid", gap: 16 }}>
          {proposals.map((p) => (
            <form
              key={p.id}
              action={patchGovSignal}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 8
              }}
            >
              <input type="hidden" name="id" value={p.id} />
              <div style={{ fontWeight: 700 }}>
                {p.slug} <span style={{ opacity: 0.65, fontWeight: 500 }}>({p.id})</span>
              </div>
              <label style={lbl}>
                title
                <input name="title" defaultValue={p.title} style={inp} />
              </label>
              <label style={lbl}>
                status
                <select name="status" defaultValue={p.status} style={inp}>
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="closed">closed</option>
                </select>
              </label>
              <label style={lbl}>
                powerBasis
                <select name="powerBasis" defaultValue={p.powerBasis} style={inp}>
                  <option value="cex_ldx_available">cex_ldx_available</option>
                  <option value="cex_ldx_staked">cex_ldx_staked</option>
                </select>
              </label>
              <label style={lbl}>
                description
                <textarea name="description" rows={3} defaultValue={p.description ?? ""} style={{ ...inp, resize: "vertical" }} />
              </label>
              <label style={lbl}>
                startsAt
                <input name="startsAt" defaultValue={p.startsAt ?? ""} style={inp} />
              </label>
              <label style={lbl}>
                endsAt
                <input name="endsAt" defaultValue={p.endsAt ?? ""} style={inp} />
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
