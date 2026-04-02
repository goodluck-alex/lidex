const { PAIRS } = require("@lidex/shared");

function listPairs() {
  return { active: PAIRS.phase1.active, comingSoon: PAIRS.phase1.comingSoon };
}

module.exports = { listPairs };

