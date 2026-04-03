const { getMergedPhase1PairsAsync } = require("../../lib/dexPairsFromEnv");

async function list() {
  const phase1 = await getMergedPhase1PairsAsync();
  return { phase1 };
}

module.exports = { list };

