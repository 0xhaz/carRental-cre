/**
 * Native ETH Payment Hooks
 * All payments in RegShield use native ETH (no ERC-20 tokens).
 * These hooks provide ETH balance and formatting utilities.
 */

import { useAccount, useBalance } from "wagmi";
import { formatEther, parseEther } from "viem";

/**
 * Get native ETH balance for an address
 */
export function useTokenBalance(address?: `0x${string}`) {
  const result = useBalance({
    address,
    query: {
      enabled: !!address,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data.value) : "0",
    symbol: result.data?.symbol ?? "ETH",
  };
}

/**
 * Get current user's ETH balance
 */
export function useMyTokenBalance() {
  const { address } = useAccount();
  return useTokenBalance(address);
}

/**
 * Helper to format ETH amount from wei
 */
export function formatTokenAmount(amount: bigint | string): string {
  if (typeof amount === "string") {
    return amount;
  }
  return formatEther(amount);
}

/**
 * Helper to parse ETH amount from user input to wei
 */
export function parseTokenAmount(amount: string): bigint {
  return parseEther(amount);
}
