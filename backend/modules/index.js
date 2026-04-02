const authRoutes = require("./auth/auth.routes");
const swapRoutes = require("./swap/swap.routes");
const tradeRoutes = require("./trade/trade.routes");
const walletRoutes = require("./wallet/wallet.routes");
const referralRoutes = require("./referral/referral.routes");
const stakingRoutes = require("./staking/staking.routes");

module.exports = {
  auth: authRoutes,
  swap: swapRoutes,
  trade: tradeRoutes,
  wallet: walletRoutes,
  referral: referralRoutes,
  staking: stakingRoutes
};

