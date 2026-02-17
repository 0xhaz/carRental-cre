"use client";

import { Investment, Vehicle } from "@/types";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import Image from "next/image";
import Link from "next/link";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

function OnChainBalance({ tokenAddress, label }: { tokenAddress: string; label: string }) {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!tokenAddress },
  });

  const { data: tokenName } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "name",
    query: { enabled: !!tokenAddress },
  });

  const formatted = balance ? parseFloat(formatUnits(balance as bigint, 18)) : 0;
  const displayLabel = tokenName ? (tokenName as string) : label;

  return (
    <div>
      <p className="text-xs text-gray-600">{displayLabel}</p>
      <p className="text-base font-semibold text-blue-600">
        {formatted > 0 ? formatted.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0"}
      </p>
    </div>
  );
}

function useTokenSymbol(tokenAddress?: string) {
  const { data: symbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!tokenAddress },
  });
  return symbol as string | undefined;
}

export interface PortfolioCardProps {
  investment: Investment;
  vehicle?: Vehicle;
  onViewDetails?: (investmentId: string) => void;
  className?: string;
}

export function PortfolioCard({
  investment,
  vehicle,
  className
}: PortfolioCardProps) {
  const v = vehicle as any;
  const assetTokenAddr = v?.assetTokenAddress;
  const revenueTokenAddr = v?.revenueTokenAddress;
  const assetSymbol = useTokenSymbol(assetTokenAddr);
  const revenueSymbol = useTokenSymbol(revenueTokenAddr);

  // Calculate current value (mock: 10% appreciation + revenue earned)
  const totalValue = investment.amount * 1.1;
  const profitLoss = totalValue - investment.amount + investment.totalRevenueEarned;
  const profitLossPercentage = (profitLoss / investment.amount) * 100;
  const isProfit = profitLoss >= 0;

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex flex-col md:flex-row">
        {/* Vehicle Image */}
        {vehicle && (
          <div className="relative w-full md:w-48 h-48 overflow-hidden">
            <Image
              src={vehicle.image || "/assets/car_image1.png"}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-full object-cover"
              width={192}
              height={192}
            />
            <div className="absolute top-2 left-2">
              <Badge
                variant={investment.status === "active" ? "success" : investment.status === "cancelled" ? "error" : "default"}
              >
                {investment.status}
              </Badge>
            </div>
          </div>
        )}

        <CardContent className="flex-1 p-6">
          {/* Vehicle Info */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Investment"}
              </h3>
              <p className="text-sm text-gray-600">
                Investment ID: {investment._id.slice(-8)}
              </p>
              {investment.txHash && (
                <a
                  href={getEtherscanUrl(SEPOLIA_CHAIN_ID, investment.txHash, "tx")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  Tx: {investment.txHash.slice(0, 10)}...
                </a>
              )}
            </div>
            <Link href={`/investor/investment/${investment._id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          </div>

          {/* Investment Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600">Initial Investment</p>
              <p className="text-base font-semibold text-gray-900">
                {formatCurrency(investment.amount)}
              </p>
              {(investment as any).amountEth > 0 && (
                <p className="text-xs text-gray-500">{(investment as any).amountEth} ETH</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-600">Current Value</p>
              <p className="text-base font-semibold text-gray-900">
                {formatCurrency(totalValue)}
              </p>
            </div>
            {assetTokenAddr ? (
              <OnChainBalance tokenAddress={assetTokenAddr} label="Asset Tokens" />
            ) : (
              <div>
                <p className="text-xs text-gray-600">{assetSymbol || "Asset"} Tokens</p>
                <p className="text-base font-semibold text-gray-400">--</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-600">Revenue Earned</p>
              <p className="text-base font-semibold text-green-600">
                {formatCurrency(investment.totalRevenueEarned)}
              </p>
            </div>
          </div>

          {/* Contract Addresses */}
          {(assetTokenAddr || revenueTokenAddr) && (
            <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
              {assetTokenAddr && (
                <a
                  href={getEtherscanUrl(SEPOLIA_CHAIN_ID, assetTokenAddr, "address")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-500 hover:underline"
                >
                  {assetSymbol || "AST"}: {assetTokenAddr.slice(0, 8)}...{assetTokenAddr.slice(-4)}
                </a>
              )}
              {revenueTokenAddr && (
                <a
                  href={getEtherscanUrl(SEPOLIA_CHAIN_ID, revenueTokenAddr, "address")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-green-500 hover:underline"
                >
                  {revenueSymbol || "REV"}: {revenueTokenAddr.slice(0, 8)}...{revenueTokenAddr.slice(-4)}
                </a>
              )}
            </div>
          )}

          {/* Profit/Loss Indicator */}
          <div className={`rounded-lg p-3 ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Return</span>
              <div className="text-right">
                <p className={`text-lg font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                  {isProfit ? "+" : ""}{formatCurrency(profitLoss)}
                </p>
                <p className={`text-xs ${isProfit ? "text-green-600" : "text-red-600"}`}>
                  {isProfit ? "+" : ""}{profitLossPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

// Skeleton loader
export function PortfolioCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-48 h-48 bg-gray-200 animate-pulse" />
        <CardContent className="flex-1 p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-16 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </div>
    </Card>
  );
}
