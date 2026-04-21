function publicAppOrigin() {
  const raw = process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || "http://localhost:3001";
  return String(raw).replace(/\/$/, "");
}

/** Share URL uses DB `referralCode` only — never derive from client wallet. */
function linkFromStoredReferralCode(referralCode) {
  const base = publicAppOrigin();
  const code = referralCode ? String(referralCode).trim() : "";
  if (!code) return `${base}/`;
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

module.exports = { linkFromStoredReferralCode, emptyStats, publicAppOrigin };
