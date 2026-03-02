"use client";

import { useState } from "react";
import { Investment, Vehicle } from "@/types";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { formatEther } from "viem";
import Image from "next/image";
import Link from "next/link";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";
import { useMyClaimableRevenue } from "@/hooks/useInvestment";
import { useEthPrice } from "@/hooks/usePriceFeed";
import {
  useMyAssetTokenBalance,
  useMyAssetTokenIsFrozen,
  useMyOwnershipPercentage,
  useAssetTokenVehicleInfo,
} from "@/hooks/useAssetToken";
import {
  useMyRevenueTokenBalance,
  useMyRevenueSharePercentage,
  useRevenueTokenVehicleInfo,
} from "@/hooks/useRevenueToken";

const FALLBACK_IMAGE = "/assets/car_image1.png";

function OnChainBalance({ tokenAddress, label, variant }: { tokenAddress: string; label: string; variant: "asset" | "revenue" }) {
  const assetAddr = variant === "asset" ? (tokenAddress as `0x${string}`) : undefined;
  const revenueAddr = variant === "revenue" ? (tokenAddress as `0x${string}`) : undefined;

  const { formatted: assetBal } = useMyAssetTokenBalance(assetAddr);
  const { formatted: revenueBal } = useMyRevenueTokenBalance(revenueAddr);
  const { data: assetFrozen } = useMyAssetTokenIsFrozen(assetAddr);

  const { vin: assetVin } = useAssetTokenVehicleInfo(assetAddr);
  const { vin: revenueVin } = useRevenueTokenVehicleInfo(revenueAddr);

  const formatted = parseFloat(variant === "asset" ? assetBal : revenueBal);
  const isFrozen = variant === "asset" && assetFrozen === true;
  const displayLabel = (variant === "asset" ? assetVin : revenueVin) || label;

  return (
    <div>
      <div className="flex items-center gap-1">
        <p className="text-xs text-gray-600">{displayLabel}</p>
        {isFrozen && <Badge variant="error" className="text-[10px] px-1 py-0">Frozen</Badge>}
      </div>
      {formatted > 0 ? (
        <p className={`text-base font-semibold ${variant === "asset" ? "text-blue-600" : "text-green-600"}`}>
          {formatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </p>
      ) : (
        <p className="text-base font-semibold text-gray-400">Pending</p>
      )}
    </div>
  );
}

function useTokenSymbol(tokenAddress?: string, variant?: "asset" | "revenue") {
  const addr = tokenAddress as `0x${string}` | undefined;
  const { vin: assetVin } = useAssetTokenVehicleInfo(variant === "asset" ? addr : undefined);
  const { vin: revenueVin } = useRevenueTokenVehicleInfo(variant === "revenue" ? addr : undefined);
  return variant === "asset" ? assetVin : revenueVin;
}

function OnChainRevenue({ vehicleNftId, dbRevenue }: { vehicleNftId?: number | null; dbRevenue: number }) {
  const nftId = vehicleNftId != null ? BigInt(vehicleNftId) : undefined;
  const { data: claimableWei } = useMyClaimableRevenue(nftId);
  const { price: ethPrice } = useEthPrice();

  // DB stores already-claimed revenue; on-chain shows unclaimed. Total = both.
  const claimable = claimableWei ? parseFloat(formatEther(claimableWei as bigint)) : 0;
  const onChainUsd = claimable * (ethPrice || 0);
  const totalRevenue = (dbRevenue || 0) + onChainUsd;

  if (totalRevenue > 0) {
    return (
      <p className="text-base font-semibold text-green-600">
        {formatCurrency(totalRevenue)}
      </p>
    );
  }

  return <p className="text-base font-semibold text-gray-400">$0</p>;
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
  const [imgSrc, setImgSrc] = useState(vehicle?.image || FALLBACK_IMAGE);
  const v = vehicle as any;
  const assetTokenAddr = v?.assetTokenAddress;
  const revenueTokenAddr = v?.revenueTokenAddress;
  const assetSymbol = useTokenSymbol(assetTokenAddr, "asset");
  const revenueSymbol = useTokenSymbol(revenueTokenAddr, "revenue");

  // On-chain ownership & revenue share
  const { percentageDisplay: ownershipPct } = useMyOwnershipPercentage(assetTokenAddr as `0x${string}` | undefined);
  const { percentageDisplay: revSharePct } = useMyRevenueSharePercentage(revenueTokenAddr as `0x${string}` | undefined);

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
              src={imgSrc}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-full object-cover"
              width={192}
              height={192}
              onError={() => setImgSrc(FALLBACK_IMAGE)}
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
              <OnChainBalance tokenAddress={assetTokenAddr} label="Asset Tokens" variant="asset" />
            ) : (
              <div>
                <p className="text-xs text-gray-600">{assetSymbol || "Asset"} Tokens</p>
                <p className="text-base font-semibold text-gray-400">--</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-600">Revenue Earned</p>
              <OnChainRevenue vehicleNftId={v?.vehicleNftId} dbRevenue={investment.totalRevenueEarned} />
            </div>
          </div>

          {/* Ownership & Revenue Share */}
          {(ownershipPct !== "0%" || revSharePct !== "0%") && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-indigo-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-600">Ownership</p>
                <p className="text-sm font-bold text-indigo-700">{ownershipPct}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-600">Revenue Share</p>
                <p className="text-sm font-bold text-emerald-700">{revSharePct}</p>
              </div>
            </div>
          )}

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
