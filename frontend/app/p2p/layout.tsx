import React from "react";
import { PageShell } from "../../components/ui";

export default function P2PLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      title="P2P"
      subtitle="Peer-to-peer trades with local payment methods. Orders use a timed flow, in-app chat, and seller release — fund custody upgrades ship in later phases."
    >
      {children}
    </PageShell>
  );
}
