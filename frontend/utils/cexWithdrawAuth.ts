import { getAddress } from "viem";

/** Must match `buildWithdrawAuthMessage` in `backend/modules/cex/cex.onchain.js`. */
export function buildCexWithdrawAuthMessage(opts: {
  fromAddress: string;
  toAddress: string;
  asset: string;
  amount: string;
  chainId: number;
  expiryUnix: number;
  nonce: string;
}) {
  const from = getAddress(opts.fromAddress as `0x${string}`).toLowerCase();
  const to = getAddress(opts.toAddress as `0x${string}`).toLowerCase();
  const a = opts.asset.trim().toUpperCase();
  const amt = opts.amount.trim();
  return `Lidex CEX Withdraw\nfrom=${from}\nto=${to}\nasset=${a}\namount=${amt}\nchainId=${Number(opts.chainId)}\nexpiry=${Number(opts.expiryUnix)}\nnonce=${opts.nonce}`;
}
