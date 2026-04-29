const referralService = require("./referral.service");

async function link(req, res) {
  if (req?.user?.id && req?.user?.address) {
    return referralService.link({ user: req.user });
  }
  return referralService.linkForAddress({ address: req.query?.address });
}

async function stats(req, res) {
  return referralService.stats({ user: req?.user });
}

async function users(req, res) {
  return referralService.users({ user: req?.user });
}

module.exports = { link, stats, users };

