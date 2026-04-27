const { prisma } = require("../../lib/prisma");

function enabled() {
  return String(process.env.DEX_SWAP_TELEMETRY_ENABLED || "false").toLowerCase() === "true";
}

async function record(event) {
  if (!enabled()) return;
  try {
    await prisma.dexSwapEvent.create({ data: event });
  } catch {
    // best-effort
  }
}

module.exports = { record };

