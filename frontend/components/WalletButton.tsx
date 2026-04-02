"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

/** RainbowKit connect / account / network controls (replaces MetaMask-only custom UI). */
export function WalletButton() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
    </div>
  );
}
