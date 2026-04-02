const ethereum = require("./ethereum");
const bnb = require("./bnb");
const polygon = require("./polygon");
const arbitrum = require("./arbitrum");
const avalanche = require("./avalanche");

const ALL = [ethereum, bnb, polygon, arbitrum, avalanche];

const byChainId = Object.fromEntries(ALL.map((c) => [c.chainId, c]));

module.exports = { ALL, byChainId };

