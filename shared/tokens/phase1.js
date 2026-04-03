// Phase 1 token presets for quoting and basic UI.

module.exports = {
  1: {
    // Wrapped ETH (label as ETH for pairs like ETH/USDT).
    ETH: { symbol: "ETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
    WETH: { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
    USDT: { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    MATIC: { symbol: "MATIC", address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", decimals: 18 }
  },
  56: {
    // Wrapped BNB (label as BNB for pairs like LDX/BNB).
    BNB: { symbol: "BNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
    USDT: { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
    LDX: { symbol: "LDX", address: "0x567A4F63f6838005e104C053fc24a3510b0432E1", decimals: 18 },
    // Binance-Peg ETH (BEP20) for LDX/ETH-style quotes when pools exist.
    ETH: { symbol: "ETH", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18 },
  },
  137: {
    // Wrapped MATIC (label as MATIC for pairs like MATIC/USDT).
    MATIC: { symbol: "MATIC", address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
    WMATIC: { symbol: "WMATIC", address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
    USDT: { symbol: "USDT", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 }
  },
  42161: {
    WETH: { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18 },
    USDT: { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
    ARB: { symbol: "ARB", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18 }
  },
  43114: {
    // Wrapped AVAX (label as AVAX for pairs like AVAX/USDT).
    AVAX: { symbol: "AVAX", address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", decimals: 18 },
    WAVAX: { symbol: "WAVAX", address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", decimals: 18 },
    // Avalanche USDT (bridged). Used for AVAX/USDT quotes when 0x routing exists.
    USDT: { symbol: "USDT", address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", decimals: 6 }
  }
};

