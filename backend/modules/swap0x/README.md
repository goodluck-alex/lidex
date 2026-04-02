# swap0x (Phase 1)

This module proxies 0x Swap API v2 for **quotes** and returns the tx payload the wallet can sign.

## Env

- `OX_API_KEY` (recommended): 0x API key for higher rate limits.
- `SWAP_FEE_RECIPIENT` (optional): your fee receiver address.
- `SWAP_FEE_BPS` (optional): platform fee in bps. Examples: `50` = 0.5%, `100` = 1%.
- `SWAP_FEE_TOKEN` (optional): `"buyToken"` or `"sellToken"` (recommended), or a token address.

