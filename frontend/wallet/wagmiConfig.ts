import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, avalanche, bsc, mainnet, polygon } from "wagmi/chains";

const fromEnv = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

/**
 * WalletConnect Cloud id (https://cloud.walletconnect.com) → `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
 * If unset or blank, we pass the literal `YOUR_PROJECT_ID`; RainbowKit substitutes its **demo** project id
 * so dev runs without env. Use a real id in production.
 */
const projectId = fromEnv && fromEnv.length > 0 ? fromEnv : "YOUR_PROJECT_ID";

export const wagmiConfig = getDefaultConfig({
  appName: "Lidex",
  projectId,
  chains: [bsc, mainnet, polygon, arbitrum, avalanche],
  ssr: true,
});
