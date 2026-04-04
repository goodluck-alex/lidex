import type { CSSProperties } from "react";
import Link from "next/link";
import { PageShell, Card } from "../../../components/ui";

const cardLink: CSSProperties = {
  display: "block",
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(150,200,255,0.95)",
  textDecoration: "none",
  fontWeight: 600,
  marginBottom: 10
};

export default function InternalAdminHomePage() {
  return (
    <PageShell
      title="Operator console"
      subtitle="Uses the same /v1/admin APIs as curl; ADMIN_API_KEY stays on the server."
    >
      <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        <Card title="Queues & config">
          <Link href="/internal-admin/audit-logs" style={cardLink}>
            Mutation audit log (read-only)
          </Link>
          <Link href="/internal-admin/listings" style={cardLink}>
            Token listing applications & registry
          </Link>
          <Link href="/internal-admin/dex-pairs" style={cardLink}>
            DEX pair activations
          </Link>
          <Link href="/internal-admin/launchpad" style={cardLink}>
            Launchpad sales
          </Link>
          <Link href="/internal-admin/liq-mining" style={cardLink}>
            Liquidity mining campaigns
          </Link>
          <Link href="/internal-admin/governance" style={cardLink}>
            Governance signals
          </Link>
        </Card>
      </div>
    </PageShell>
  );
}
