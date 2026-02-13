"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Card, CardContent, Badge, Skeleton } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { useMyInvestments } from "@/hooks/useInvestment";

// Minimal ERC20 ABI for reading balance, symbol, and decimals
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

interface TokenBalanceProps {
  tokenAddress: `0x${string}`;
  userAddress: `0x${string}`;
  label: string;
  variant?: "asset" | "revenue";
}

/**
 * Component to display a single token balance
 */
function TokenBalance({ tokenAddress, userAddress, label, variant = "asset" }: TokenBalanceProps) {
  // Fetch token balance
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress],
  });

  // Fetch token symbol
  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  // Fetch token decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  if (balanceLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  const formattedBalance = balance && decimals
    ? formatUnits(balance as bigint, decimals as number)
    : "0";

  const numericBalance = parseFloat(formattedBalance);
  const hasBalance = numericBalance > 0;

  return (
    <div className={`p-4 rounded-lg ${variant === "asset" ? "bg-blue-50" : "bg-green-50"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-600">{label}</p>
        {hasBalance && (
          <Badge variant={variant === "asset" ? "default" : "success"} className="text-xs">
            Active
          </Badge>
        )}
      </div>
      <p className={`text-2xl font-bold ${variant === "asset" ? "text-blue-600" : "text-green-600"}`}>
        {parseFloat(formattedBalance).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        })}{" "}
        <span className="text-sm">{symbol || "TOKENS"}</span>
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Token: {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
      </p>
    </div>
  );
}

export interface TokenPortfolioProps {
  className?: string;
}

/**
 * TokenPortfolio Component
 * Displays user's AssetToken and RevenueToken holdings across all investments
 */
export function TokenPortfolio({ className }: TokenPortfolioProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { data: investments, isLoading: investmentsLoading } = useMyInvestments();

  // Show wallet connection prompt
  if (!isConnected || !userAddress) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <span className="text-3xl">🔌</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-sm text-gray-600">
              Please connect your wallet to view your token portfolio
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (investmentsLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Parse investments data
  const investmentsList = investments ? (Array.isArray(investments) ? investments : []) : [];

  // No investments
  if (investmentsList.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <span className="text-3xl">💼</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Investments Yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              You haven't made any investments. Start investing to build your portfolio!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Token Portfolio</h2>
            <Badge variant="default">
              {investmentsList.length} {investmentsList.length === 1 ? "Investment" : "Investments"}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            Your AssetToken and RevenueToken holdings across all vehicle investments
          </p>
        </div>

        {/* Portfolio Items */}
        <div className="space-y-6">
          {investmentsList.map((investment: any, index: number) => {
            // Extract token addresses from investment data
            // Note: The actual data structure may vary based on smart contract
            const assetTokenAddress = investment.assetTokenAddress as `0x${string}` | undefined;
            const revenueTokenAddress = investment.revenueTokenAddress as `0x${string}` | undefined;
            const vehicleId = investment.vehicleId?.toString() || `Investment #${index + 1}`;

            return (
              <div key={index} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                {/* Investment Header */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Vehicle #{vehicleId}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Investment Amount: {formatCurrency(investment.amount || 0)}
                  </p>
                </div>

                {/* Token Balances Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* AssetToken Balance */}
                  {assetTokenAddress ? (
                    <TokenBalance
                      tokenAddress={assetTokenAddress}
                      userAddress={userAddress}
                      label="AssetToken (AST)"
                      variant="asset"
                    />
                  ) : (
                    <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">
                      <p className="text-xs text-gray-500 mb-1">AssetToken (AST)</p>
                      <p className="text-sm text-gray-400">Not deployed yet</p>
                    </div>
                  )}

                  {/* RevenueToken Balance */}
                  {revenueTokenAddress ? (
                    <TokenBalance
                      tokenAddress={revenueTokenAddress}
                      userAddress={userAddress}
                      label="RevenueToken (REV)"
                      variant="revenue"
                    />
                  ) : (
                    <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">
                      <p className="text-xs text-gray-500 mb-1">RevenueToken (REV)</p>
                      <p className="text-sm text-gray-400">Not deployed yet</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Portfolio Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Investments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {investmentsList.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Active Tokens</p>
                <p className="text-2xl font-bold text-gray-900">
                  {investmentsList.filter((inv: any) =>
                    inv.assetTokenAddress || inv.revenueTokenAddress
                  ).length * 2}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for TokenPortfolio
 */
export function TokenPortfolioSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-6">
          <div>
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
          <div>
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
