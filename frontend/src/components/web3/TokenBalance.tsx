"use client";

/**
 * Token Balance Component
 * Displays user's native ETH balance
 */

import { useMyTokenBalance } from "@/hooks/usePaymentToken";
import { useAccount } from "wagmi";

interface TokenBalanceProps {
  showFull?: boolean;
  className?: string;
}

export function TokenBalance({ showFull = false, className = "" }: TokenBalanceProps) {
  const { isConnected } = useAccount();
  const { data, formatted, isLoading, error } = useMyTokenBalance();

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        Error loading balance
      </div>
    );
  }

  const displayBalance = showFull ? formatted : parseFloat(formatted).toFixed(4);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col">
        {showFull && <span className="text-xs text-gray-500">Balance</span>}
        <div className="flex items-center gap-1">
          <span className="font-semibold">{displayBalance}</span>
          <span className="text-sm text-gray-600">ETH</span>
        </div>
      </div>
    </div>
  );
}
