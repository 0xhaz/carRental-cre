/**
 * Chainlink Price Feed Hooks
 * Reads ETH/USD price from Chainlink AggregatorV3Interface on Sepolia.
 * No helper contract needed — reads directly from the price feed.
 */

import { useReadContract } from "wagmi";

// Chainlink ETH/USD Price Feed on Sepolia
const ETH_USD_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306" as const;

// AggregatorV3Interface ABI (only latestRoundData needed)
const PRICE_FEED_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Get the current ETH/USD price from Chainlink.
 * Chainlink returns price with 8 decimals (e.g., 250000000000 = $2500.00).
 * Auto-refetches every 60 seconds.
 */
export function useEthPrice() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ETH_USD_PRICE_FEED,
    abi: PRICE_FEED_ABI,
    functionName: "latestRoundData",
    query: {
      refetchInterval: 60_000, // Poll every 60s
    },
  });

  const price = data ? Number(data[1]) / 1e8 : 0;
  const updatedAt = data ? new Date(Number(data[3]) * 1000) : null;

  return {
    /** ETH price in USD (e.g., 2500.00) */
    price,
    isLoading,
    error,
    /** When the price was last updated on-chain */
    updatedAt,
    refetch,
  };
}

/**
 * Convert ETH amount to USD using live Chainlink price.
 */
export function useEthToUsd(ethAmount: number) {
  const { price, isLoading } = useEthPrice();
  return {
    usd: ethAmount * price,
    price,
    isLoading,
  };
}

/**
 * Convert USD amount to ETH using live Chainlink price.
 */
export function useUsdToEth(usdAmount: number) {
  const { price, isLoading } = useEthPrice();
  return {
    eth: price > 0 ? usdAmount / price : 0,
    price,
    isLoading,
  };
}
