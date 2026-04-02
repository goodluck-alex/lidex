function codeForAddress(address) {
  // Phase 1: referral code is just the wallet address (lowercased).
  // You can replace later with short codes.
  return String(address).toLowerCase();
}

function linkForUser(user) {
  const address = user?.address || user?.id || "guest";
  const code = codeForAddress(address);
  return `http://localhost:3001/?ref=${encodeURIComponent(code)}`;
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

module.exports = { codeForAddress, linkForUser, emptyStats };

