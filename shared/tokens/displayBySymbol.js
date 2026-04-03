/**
 * Human-readable names + logos for pair tickers and swap presets.
 * Major assets: CoinGecko CDN thumbnails (widely used; replace with self-hosted if required).
 * LDX: app-relative path served by Next (`/public/lidex-logo.png`).
 */
module.exports = {
  ETH: {
    name: "Ethereum",
    logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png"
  },
  WETH: {
    name: "Wrapped Ether",
    logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png"
  },
  BNB: {
    name: "BNB",
    logoUrl: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png"
  },
  USDT: {
    name: "Tether USD",
    logoUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png"
  },
  MATIC: {
    name: "Polygon",
    logoUrl: "https://assets.coingecko.com/coins/images/4713/small/polygon.png"
  },
  WMATIC: {
    name: "Wrapped MATIC",
    logoUrl: "https://assets.coingecko.com/coins/images/4713/small/polygon.png"
  },
  LDX: {
    name: "Lidex",
    logoUrl: "/lidex-logo.png"
  },
  AVAX: {
    name: "Avalanche",
    logoUrl: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png"
  },
  WAVAX: {
    name: "Wrapped AVAX",
    logoUrl: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png"
  },
  ARB: {
    name: "Arbitrum",
    logoUrl: "https://assets.coingecko.com/coins/images/16547/small/arb.jpg"
  }
};
