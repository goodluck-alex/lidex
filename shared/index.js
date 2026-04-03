module.exports = {
  ...require("./constants"),
  CHAINS: require("./chains/index.js"),
  TOKENS: require("./tokens/index.js"),
  PAIRS: require("./pairs"),
  /** Canonical LDX metadata + explorers — see docs/deployments.md */
  LDX: require("./tokens/ldx"),
  /** Ticker → { name, logoUrl } for markets / presets (see tokens/displayBySymbol.js) */
  TOKEN_DISPLAY: require("./tokens/displayBySymbol"),
};

