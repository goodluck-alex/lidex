import type { CSSProperties } from "react";
import Link from "next/link";
import { adminApi } from "../../../lib/adminServer";
import { PageShell, Card } from "../../../components/ui";

type Entry = {
  id: string;
  createdAt: string;
  method: string;
  path: string;
  statusCode: number;
  keyFingerprint: string | null;
  resource: string | null;
  ip: string | null;
  supportTicketId: string | null;
  approverKeyFingerprint: string | null;
};

export default async function InternalAdminAuditLogsPage({
  searchParams
}: {
  searchParams: Promise<{ cursor?: string; resource?: string; method?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  q.set("limit", "100");
  if (sp.cursor) q.set("cursor", sp.cursor);
  if (sp.resource) q.set("resource", sp.resource);
  if (sp.method) q.set("method", sp.method);

  let entries: Entry[] = [];
  let nextCursor: string | null = null;
  let err: string | null = null;
  try {
    const data = await adminApi<{ entries: Entry[]; nextCursor: string | null }>(
      `/v1/admin/audit-logs?${q.toString()}`
    );
    entries = data.entries || [];
    nextCursor = data.nextCursor ?? null;
  } catch (e: unknown) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  const nextQs = new URLSearchParams();
  nextQs.set("limit", "100");
  if (sp.resource) nextQs.set("resource", sp.resource);
  if (sp.method) nextQs.set("method", sp.method);
  if (nextCursor) nextQs.set("cursor", nextCursor);

  if (err) {
    return (
      <PageShell title="Mutation audit log">
        <Card tone="danger" title="Error">
          {err}
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
            Use a server <code style={{ opacity: 0.9 }}>ADMIN_API_KEY</code> with role <strong>super</strong> or{" "}
            <strong>audit_read</strong> in <code>ADMIN_API_KEYS_JSON</code>.
          </p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Mutation audit log"
      subtitle="POST/PATCH/DELETE under /v1/admin. Filter via query — example: ?resource=launchpad/sales&method=POST"
    >
      <Card title={`${entries.length} rows${nextCursor ? " (more below)" : ""}`}>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.8 }}>
          Quick filters:{" "}
          <Link href="/internal-admin/audit-logs?resource=listings/applications" style={filterLink}>
            listings/*
          </Link>{" "}
          <Link href="/internal-admin/audit-logs?resource=launchpad/sales" style={filterLink}>
            launchpad/sales
          </Link>{" "}
          <Link href="/internal-admin/audit-logs" style={filterLink}>
            all
          </Link>
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "6px 4px" }}>When</th>
                <th style={{ padding: "6px 4px" }}>M</th>
                <th style={{ padding: "6px 4px" }}>Status</th>
                <th style={{ padding: "6px 4px" }}>Path</th>
                <th style={{ padding: "6px 4px" }}>Resource</th>
                <th style={{ padding: "6px 4px" }}>Key</th>
                <th style={{ padding: "6px 4px" }}>Ticket</th>
                <th style={{ padding: "6px 4px" }}>2nd</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "6px 4px", whiteSpace: "nowrap", opacity: 0.9 }}>
                    {new Date(r.createdAt).toISOString().replace("T", " ").slice(0, 19)} UTC
                  </td>
                  <td style={{ padding: "6px 4px" }}>{r.method}</td>
                  <td style={{ padding: "6px 4px" }}>{r.statusCode}</td>
                  <td style={{ padding: "6px 4px", fontFamily: "monospace", maxWidth: 280, wordBreak: "break-all" }}>
                    {r.path}
                  </td>
                  <td style={{ padding: "6px 4px", opacity: 0.85 }}>{r.resource ?? "—"}</td>
                  <td style={{ padding: "6px 4px", fontFamily: "monospace" }}>{r.keyFingerprint ?? "—"}</td>
                  <td style={{ padding: "6px 4px", fontSize: 11 }}>{r.supportTicketId ?? "—"}</td>
                  <td style={{ padding: "6px 4px", fontFamily: "monospace", fontSize: 11 }}>
                    {r.approverKeyFingerprint ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {nextCursor ? (
          <p style={{ marginTop: 12 }}>
            <Link href={`/internal-admin/audit-logs?${nextQs.toString()}`} style={filterLink}>
              Next page →
            </Link>
          </p>
        ) : null}
      </Card>
    </PageShell>
  );
}

const filterLink: CSSProperties = {
  color: "rgba(130,190,255,0.95)",
  marginRight: 10
};
