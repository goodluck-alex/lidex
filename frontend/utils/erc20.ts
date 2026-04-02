export const ERC20_ABI = {
  approveSelector: "0x095ea7b3",
  allowanceSelector: "0xdd62ed3e"
};

function strip0x(hex: string) {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function pad32(hexNo0x: string) {
  return hexNo0x.padStart(64, "0");
}

export function encodeApprove(spender: string, amountHex: string) {
  const spenderWord = pad32(strip0x(spender).toLowerCase());
  const amountWord = pad32(strip0x(amountHex).toLowerCase());
  return `${ERC20_ABI.approveSelector}${spenderWord}${amountWord}`;
}

export function encodeAllowance(owner: string, spender: string) {
  const ownerWord = pad32(strip0x(owner).toLowerCase());
  const spenderWord = pad32(strip0x(spender).toLowerCase());
  return `${ERC20_ABI.allowanceSelector}${ownerWord}${spenderWord}`;
}

export function maxUint256Hex() {
  return "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
}

export function hexToBigInt(hex: string) {
  if (!hex) return 0n;
  return BigInt(hex);
}

