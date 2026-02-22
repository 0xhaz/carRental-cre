"use client";

/**
 * Wagmi & Thirdweb Configuration for RegShield
 * Sets up Web3 connectivity with deployed contracts
 */

import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { createThirdwebClient } from "thirdweb";

// Environment variables
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";
const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

/**
 * Thirdweb Client Configuration
 * Used for enhanced Web3 features and better DX
 */
export const thirdwebClient = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
});

/**
 * Wagmi Configuration
 * Primary Web3 connection manager
 *
 * Note: To enable WalletConnect, set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
 * Get your project ID at https://cloud.walletconnect.com/
 */
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    // MetaMask & Browser Wallets
    injected({
      target: "metaMask",
    }),
    // Coinbase Wallet
    coinbaseWallet({
      appName: "RegShield",
      appLogoUrl: "https://regshield.io/logo.png",
    }),
  ],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL),
  },
  ssr: true, // Enable SSR for Next.js
});

// Export types
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
