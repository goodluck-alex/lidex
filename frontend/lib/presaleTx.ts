import { encodeFunctionData, parseUnits, toHex, type Abi } from "viem";

export function buildPresaleAbi(paymentMode: "native" | "erc20", functionName: string): Abi {
  if (paymentMode === "native") {
    return [
      {
        type: "function",
        name: functionName,
        stateMutability: "payable",
        inputs: [],
        outputs: [],
      },
    ];
  }
  return [
    {
      type: "function",
      name: functionName,
      stateMutability: "nonpayable",
      inputs: [{ name: "amount", type: "uint256" }],
      outputs: [],
    },
  ];
}

export function encodePresalePurchase(args: {
  paymentMode: "native" | "erc20";
  purchaseFunction: string;
  /** Base units of payment (wei for native, token decimals for erc20). */
  amount: bigint;
}): `0x${string}` {
  const abi = buildPresaleAbi(args.paymentMode, args.purchaseFunction);
  const name = args.purchaseFunction as never;
  if (args.paymentMode === "native") {
    return encodeFunctionData({ abi, functionName: name, args: [] });
  }
  return encodeFunctionData({ abi, functionName: name, args: [args.amount] });
}

export function parsePresaleAmount(amountHuman: string, decimals: number): bigint {
  const s = amountHuman.trim();
  if (!s) throw new Error("Enter an amount");
  const x = parseUnits(s, decimals);
  if (x <= 0n) throw new Error("Amount must be positive");
  return x;
}

export function txValueHex(paymentMode: "native" | "erc20", amountBaseUnits: bigint): string {
  return paymentMode === "native" ? toHex(amountBaseUnits) : "0x0";
}
