/** Simple level from direct referrals (Phase 1 heuristic). Pure helper for tests + graph layer. */
function levelFromDirectCount(n) {
  if (n >= 10) return 3;
  if (n >= 3) return 2;
  return 1;
}

module.exports = { levelFromDirectCount };
