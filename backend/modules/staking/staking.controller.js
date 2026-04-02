const stakingService = require("./staking.service");

async function pools(req, res) {
  return stakingService.pools();
}

async function positions(req, res) {
  return stakingService.positions({ user: req?.user });
}

async function stake(req, res) {
  return stakingService.stake({ body: req?.body, user: req?.user });
}

async function unstake(req, res) {
  return stakingService.unstake({ body: req?.body, user: req?.user });
}

module.exports = { pools, positions, stake, unstake };

