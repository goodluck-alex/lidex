// LDX token — live on BNB Smart Chain. See docs/deployments.md and BscScan.
// On-chain verification (RPC eth_call): name "Lidex", symbol "LDX", decimals 18,
// totalSupply = 500_000_000 * 10^18 wei.

module.exports = {
  symbol: "LDX",
  decimals: 18,
  name: "Lidex",
  logo: null,
  addresses: {
    56: "0x567A4F63f6838005e104C053fc24a3510b0432E1",
    1: null,
    137: null,
    42161: null,
    43114: null,
  },
  /** Human-readable total supply (tokens), not wei */
  totalSupply: "500000000",
  /** Block explorer URLs per chain id (when deployed) */
  explorerUrls: {
    56: "https://bscscan.com/token/0x567a4f63f6838005e104c053fc24a3510b0432e1",
  },
};
