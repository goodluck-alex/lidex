function publicAppOrigin() {
  const raw = process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || "http://localhost:3001";
  return String(raw).replace(/\/$/, "");
}

function codeForAddress(address) {
  // Phase 1: referral code is just the wallet address (lowercased).
  // You can replace later with short codes.
  return String(address).toLowerCase();
}

function linkForUser(user) {
  const base = publicAppOrigin();
  // Only real wallet addresses are valid ref codes (attach rejects non-0x…42).
  // Do not emit ?ref=guest — that confuses sharers and breaks attach.
  const address = user?.address ? String(user.address).toLowerCase() : null;
  if (!address) return `${base}/`;
  const code = codeForAddress(address);
  return `${base}/?ref=${encodeURIComponent(code)}`;
}

function emptyStats() {
  return {
    direct: 0,
    earnedUsd: 0,
    level: 1,
    tiers: {
      level1: 0.3,
      level2: 0.1,
      level3: 0.05
    }
  };
}

module.exports = { codeForAddress, linkForUser, emptyStats, publicAppOrigin };

