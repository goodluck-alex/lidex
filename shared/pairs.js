// Canonical pair definitions (Phase 1 foundation).

module.exports = {
  phase1: {
    active: [
      { symbol: "ETH/USDT", base: "ETH", quote: "USDT", status: "active" },
      { symbol: "BNB/USDT", base: "BNB", quote: "USDT", status: "active" },
      { symbol: "MATIC/USDT", base: "MATIC", quote: "USDT", status: "active" },
      { symbol: "AVAX/USDT", base: "AVAX", quote: "USDT", status: "active" },
      { symbol: "ARB/USDT", base: "ARB", quote: "USDT", status: "active" }
    ],
    comingSoon: [
      { symbol: "LDX/USDT", base: "LDX", quote: "USDT", status: "coming_soon" },
      { symbol: "LDX/ETH", base: "LDX", quote: "ETH", status: "coming_soon" },
      { symbol: "LDX/BNB", base: "LDX", quote: "BNB", status: "coming_soon" }
    ]
  }
};

