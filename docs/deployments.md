# Contract deployments

Canonical registry for **live** addresses. App config should match [`shared/tokens/ldx.js`](../shared/tokens/ldx.js).

## LDX (Lidex token)

| Field | Value |
|--------|--------|
| **Network** | BNB Smart Chain (chain id `56`) |
| **Contract** | `0x567A4F63f6838005e104C053fc24a3510b0432E1` |
| **Explorer** | [BscScan token page](https://bscscan.com/token/0x567a4f63f6838005e104c053fc24a3510b0432e1) |
| **Name** | Lidex |
| **Symbol** | LDX |
| **Decimals** | 18 |
| **Total supply** | 500,000,000 LDX |

On-chain reads (via `eth_call` to the contract above) match this table. The stub in `contracts/LDXToken.sol` is **not** necessarily the deployed bytecode; treat BscScan + this file as source of truth for integration.

### DEX swap (0x) and LDX

**Deploying the token is not enough** for the in-app swap to quote LDX pairs. **0x** pulls liquidity from **existing** AMM pools (on BSC, commonly **PancakeSwap**). You must **add liquidity** to those pools for each pair you want (e.g. LDX/USDT). Until then, `/v1/swap/quote` for LDX legs will not succeed — that is **expected**. After Pancake (or other supported) pools exist, quotes and execution generally **start working automatically** through the current swap integration.

To mark LDX pairs **active** in the API/UI (instead of “Coming Soon”), set **`DEX_ACTIVE_PAIR_SYMBOLS`** (and optionally **`DEX_POOL_*`**) in the backend **`.env`** — see [`dex-env.md`](./dex-env.md).

## Other chains

LDX on Ethereum, Polygon, Arbitrum, Avalanche: *not deployed yet* — `shared/tokens/ldx.js` uses `null` until addresses are added here and in shared config.
