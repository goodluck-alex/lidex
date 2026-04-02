const referralService = require("./referral.service");

async function link(req, res) {
  return referralService.link({ user: req?.user });
}

async function stats(req, res) {
  return referralService.stats({ user: req?.user });
}

async function users(req, res) {
  return referralService.users({ user: req?.user });
}

module.exports = { link, stats, users };

