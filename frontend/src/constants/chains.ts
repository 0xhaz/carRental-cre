/**
 * Chain configuration for RegShield
 */

import { Chain } from "viem";
import { sepolia } from "viem/chains";

// Supported chains
export const SUPPORTED_CHAINS: readonly Chain[] = [sepolia] as const;

// Default chain
export const DEFAULT_CHAIN = sepolia;

// Chain metadata
export const CHAIN_METADATA = {
  [sepolia.id]: {
    name: "Sepolia Testnet",
    nativeCurrency: {
      name: "Sepolia ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [sepolia.rpcUrls.default.http[0]],
      },
      public: {
        http: [sepolia.rpcUrls.default.http[0]],
      },
    },
    blockExplorers: {
      default: {
        name: "Sepolia Etherscan",
        url: "https://sepolia.etherscan.io",
      },
    },
    testnet: true,
  },
} as const;

// Get chain name
export function getChainName(chainId: number): string {
  const metadata = CHAIN_METADATA[chainId as keyof typeof CHAIN_METADATA];
  return metadata?.name || `Unknown Chain (${chainId})`;
}

// Check if chain is supported
export function isSupportedChain(chainId: number): boolean {
  return SUPPORTED_CHAINS.some((chain) => chain.id === chainId);
}
