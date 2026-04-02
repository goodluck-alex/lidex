module.exports = {
  ethereum: require("./ethereum"),
  bnb: require("./bnb"),
  polygon: require("./polygon"),
  arbitrum: require("./arbitrum"),
  avalanche: require("./avalanche"),
  byChainId: require("./registry").byChainId
};

