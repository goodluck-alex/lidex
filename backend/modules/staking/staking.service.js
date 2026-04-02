const stakingModel = require("./staking.model");

async function pools() {
  return { ok: true, pools: stakingModel.defaultPools() };
}

async function positions({ user }) {
  return { ok: true, positions: [], user: user || null };
}

async function stake({ body, user }) {
  return { ok: true, stake: { id: "placeholder" }, body, user: user || null };
}

async function unstake({ body, user }) {
  return { ok: true, unstake: { id: "placeholder" }, body, user: user || null };
}

module.exports = { pools, positions, stake, unstake };

