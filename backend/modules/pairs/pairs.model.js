const { PAIRS } = require("@lidex/shared");

function list() {
  return { phase1: PAIRS.phase1 };
}

module.exports = { list };

