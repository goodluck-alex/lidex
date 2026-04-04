import type { CSSProperties } from "react";
import { adminApi } from "../../../../lib/adminServer";
import { PageShell, Card } from "../../../../components/ui";
import { createLaunchpadSale, patchLaunchpadSale } from "../../actions";

type Sale = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  offerAsset: string;
  payAsset: string;
  pricePayPerToken: string;
  totalOfferTokens: string;
  minTierRank: number;
  startsAt: string | null;
  endsAt: string | null;
};

export default async function InternalAdminLaunchpadPage() {
  let sales: Sale[] = [];
  let enabled = true;
  let err: string | null = null;
  try {
    const data = await adminApi<{ enabled?: boolean; sales: Sale[] }>("/v1/admin/launchpad/sales");
    sales = data.sales || [];
    enabled = data.enabled !== false;
  } catch (e: unknown) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  if (err) {
    return (
      <PageShell title="Launchpad — sales">
        <Card tone="danger" title="Error">
          {err}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Launchpad — sales"
      subtitle={enabled ? "Create and patch sales (admin API mirror)." : "Feature disabled on backend."}
    >
      <Card title="Create sale">
        <form action={createLaunchpadSale} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
          <label style={lbl}>
            slug
            <input name="slug" required style={inp} />
          </label>
          <label style={lbl}>
            title
            <input name="title" required style={inp} />
          </label>
          <label style={lbl}>
            offerAsset
            <input name="offerAsset" required style={inp} />
          </label>
          <label style={lbl}>
            payAsset (CEX quote, e.g. USDT)
            <input name="payAsset" required style={inp} />
          </label>
          <label style={lbl}>
            pricePayPerToken
            <input name="pricePayPerToken" required style={inp} />
          </label>
          <label style={lbl}>
            totalOfferTokens
            <input name="totalOfferTokens" required style={inp} />
          </label>
          <label style={lbl}>
            minTierRank
            <input name="minTierRank" type="number" defaultValue={0} style={inp} />
          </label>
          <label style={lbl}>
            status
            <select name="status" defaultValue="draft" style={inp}>
              <option value="draft">draft</option>
              <option value="live">live</option>
              <option value="paused">paused</option>
              <option value="ended">ended</option>
            </select>
          </label>
          <label style={lbl}>
            summary (optional)
            <textarea name="summary" rows={2} style={{ ...inp, resize: "vertical" }} />
          </label>
          <label style={lbl}>
            startsAt (ISO, optional)
            <input name="startsAt" style={inp} placeholder="2026-01-01T00:00:00.000Z" />
          </label>
          <label style={lbl}>
            endsAt (ISO, optional)
            <input name="endsAt" style={inp} />
          </label>
          <button type="submit" style={btnPrimary}>
            Create
          </button>
        </form>
      </Card>

      <Card title={`${sales.length} sales`}>
        <div style={{ display: "grid", gap: 16 }}>
          {sales.map((s) => (
            <form
              key={s.id}
              action={patchLaunchpadSale}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 8
              }}
            >
              <input type="hidden" name="id" value={s.id} />
              <div style={{ fontWeight: 700 }}>
                {s.slug} <span style={{ opacity: 0.65, fontWeight: 500 }}>({s.id})</span>
              </div>
              <label style={lbl}>
                title
                <input name="title" defaultValue={s.title} style={inp} />
              </label>
              <label style={lbl}>
                status
                <select name="status" defaultValue={s.status} style={inp}>
                  <option value="draft">draft</option>
                  <option value="live">live</option>
                  <option value="paused">paused</option>
                  <option value="ended">ended</option>
                </select>
              </label>
              <label style={lbl}>
                minTierRank
                <input name="minTierRank" type="number" defaultValue={s.minTierRank} style={inp} />
              </label>
              <label style={lbl}>
                pricePayPerToken
                <input name="pricePayPerToken" defaultValue={s.pricePayPerToken} style={inp} />
              </label>
              <label style={lbl}>
                summary
                <textarea name="summary" rows={2} defaultValue={s.summary ?? ""} style={{ ...inp, resize: "vertical" }} />
              </label>
              <label style={lbl}>
                startsAt
                <input name="startsAt" defaultValue={s.startsAt ?? ""} style={inp} />
              </label>
              <label style={lbl}>
                endsAt
                <input name="endsAt" defaultValue={s.endsAt ?? ""} style={inp} />
              </label>
              <button type="submit" style={btnPrimary}>
                Patch sale
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
