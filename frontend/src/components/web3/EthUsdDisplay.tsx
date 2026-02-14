"use client";

import { useEthToUsd } from "@/hooks/usePriceFeed";
import { formatEther } from "viem";

interface EthUsdDisplayProps {
  /** Amount in wei (bigint) */
  amountWei?: bigint;
  /** Amount in ETH (number) — used if amountWei not provided */
  amountEth?: number;
  /** Show both ETH and USD */
  showBoth?: boolean;
  /** Which currency to show first */
  primary?: "ETH" | "USD";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays an ETH amount with its USD equivalent using live Chainlink price.
 *
 * Examples:
 *   primary="USD": $2,500.00 (1.0000 ETH)
 *   primary="ETH": 1.0000 ETH ($2,500.00)
 */
export function EthUsdDisplay({
  amountWei,
  amountEth,
  showBoth = true,
  primary = "USD",
  className,
}: EthUsdDisplayProps) {
  const eth = amountWei
    ? parseFloat(formatEther(amountWei))
    : amountEth ?? 0;
  const { usd, isLoading } = useEthToUsd(eth);

  const formattedUsd = usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedEth = `${eth.toFixed(4)} ETH`;

  if (isLoading) {
    return <span className={className}>{formattedEth}</span>;
  }

  if (primary === "USD") {
    return (
      <span className={className}>
        <span className="font-semibold">{formattedUsd}</span>
        {showBoth && (
          <span className="text-gray-500 ml-1 text-sm">({formattedEth})</span>
        )}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="font-semibold">{formattedEth}</span>
      {showBoth && (
        <span className="text-gray-500 ml-1 text-sm">({formattedUsd})</span>
      )}
    </span>
  );
}
