const rewardEngine = require("../rewards/reward.engine");

function startUnlockEngine({ intervalMs = 60 * 60 * 1000 } = {}) {
  const enabled = String(process.env.UNLOCK_ENGINE_ENABLED || "1").trim() !== "0";
  if (!enabled) return () => {};

  const handle = setInterval(() => {
    void rewardEngine.unlockDueRewards().catch((e) => {
      // Keep server alive; log for ops.
      console.warn("[unlock-engine] failed", e?.message || e);
    });
  }, Math.max(10_000, Number(intervalMs) || 60 * 60 * 1000));

  return () => clearInterval(handle);
}

module.exports = { startUnlockEngine };

