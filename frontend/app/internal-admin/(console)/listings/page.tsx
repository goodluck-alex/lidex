import type { CSSProperties } from "react";
import { adminApi } from "../../../lib/adminServer";
import { PageShell, Card } from "../../../components/ui";
import { patchListingApplication } from "../../actions";

type Application = {
  id: string;
  projectName: string;
  status: string;
  chainId: number;
  symbol: string;
  tokenAddress: string;
  createdAt: string;
};

export default async function InternalAdminListingsPage() {
  let applications: Application[] = [];
  let err: string | null = null;
  try {
    const data = await adminApi<{ applications: Application[] }>("/v1/admin/listings/applications?limit=100");
    applications = data.applications || [];
  } catch (e: unknown) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  if (err) {
    return (
      <PageShell title="Listings — applications">
        <Card tone="danger" title="Error">
          {err}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Listings — applications"
      subtitle="Queue + Phase G approve/reject (submitted only). Optional ticket + approver key — see internal-admin README."
    >
      <Card title={`${applications.length} applications`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "8px 6px" }}>Status</th>
                <th style={{ padding: "8px 6px" }}>Project</th>
                <th style={{ padding: "8px 6px" }}>Chain</th>
                <th style={{ padding: "8px 6px" }}>Symbol</th>
                <th style={{ padding: "8px 6px" }}>Token</th>
                <th style={{ padding: "8px 6px" }}>Id</th>
                <th style={{ padding: "8px 6px" }}>Review</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "8px 6px", opacity: 0.9 }}>{a.status}</td>
                  <td style={{ padding: "8px 6px" }}>{a.projectName}</td>
                  <td style={{ padding: "8px 6px" }}>{a.chainId}</td>
                  <td style={{ padding: "8px 6px" }}>{a.symbol}</td>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace", fontSize: 12 }}>{a.tokenAddress}</td>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace", fontSize: 11, opacity: 0.75 }}>{a.id}</td>
                  <td style={{ padding: "8px 6px", verticalAlign: "top", minWidth: 200 }}>
                    {a.status === "submitted" ? (
                      <form action={patchListingApplication} style={{ display: "grid", gap: 6 }}>
                        <input type="hidden" name="id" value={a.id} />
                        <input
                          name="supportTicket"
                          placeholder="Ticket id (optional)"
                          style={inputSm}
                        />
                        <input name="note" placeholder="Note (optional)" style={inputSm} />
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button type="submit" name="decision" value="approve" style={btnOk}>
                            Approve
                          </button>
                          <button type="submit" name="decision" value="reject" style={btnReject}>
                            Reject
                          </button>
                        </div>
                      </form>
                    ) : (
                      <span style={{ opacity: 0.5 }}>—</span>
                    )}
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

const inputSm: CSSProperties = {
  width: "100%",
  padding: 6,
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "white",
  fontSize: 12
};

const btnOk: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(0,200,150,0.35)",
  background: "rgba(0,200,150,0.2)",
  color: "white",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600
};

const btnReject: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,100,100,0.35)",
  background: "rgba(255,80,80,0.12)",
  color: "#ffb4b4",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600
};
