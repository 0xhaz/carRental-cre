"use client";

import { Vehicle } from "@/types";
import { Card, CardContent, CardFooter, Button, Badge, Progress } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useVehicleInvestmentTotal, useRentorCoInvestment } from "@/hooks/useInvestment";
import { useEthPrice } from "@/hooks/usePriceFeed";
import { formatEther } from "viem";

export interface InvestmentCardProps {
  vehicle: Vehicle;
  onInvest?: (vehicleId: string) => void;
  className?: string;
  basePath?: string; // e.g., "investor" or "rentor"
}

export function InvestmentCard({ vehicle, onInvest, className, basePath = "investor" }: InvestmentCardProps) {
  const { fundraising } = vehicle;

  // Fetch blockchain investment data
  const vehicleTokenId = vehicle.vehicleNftId != null ? BigInt(vehicle.vehicleNftId) : undefined;
  const { data: investmentTotal, isLoading: isLoadingInvestment } = useVehicleInvestmentTotal(vehicleTokenId);
  const { data: onChainCoInvestment } = useRentorCoInvestment(vehicleTokenId);
  const { price: ethPrice } = useEthPrice();

  if (!fundraising || !fundraising.active) {
    return null;
  }

  // On-chain raised amount (prefer total, fallback to co-investment)
  const investmentTotalEth = investmentTotal
    ? parseFloat(formatEther(investmentTotal as bigint))
    : 0;
  const coInvestEth = onChainCoInvestment
    ? parseFloat(formatEther(onChainCoInvestment as bigint))
    : 0;
  const totalRaisedEth = investmentTotalEth > 0 ? investmentTotalEth : coInvestEth;
  const totalRaisedUsd = totalRaisedEth * ethPrice;
  const effectiveRaised = totalRaisedUsd > 0 ? totalRaisedUsd : fundraising.currentAmount;

  const fundingPercentage = fundraising.targetAmount > 0
    ? Math.min((effectiveRaised / fundraising.targetAmount) * 100, 100)
    : 0;
  const remainingAmount = Math.max(fundraising.targetAmount - effectiveRaised, 0);

  // Extract blockchain data if available
  const hasBlockchainData = (investmentTotal !== undefined || onChainCoInvestment !== undefined) && !isLoadingInvestment;
  const assetTokenAddress = vehicle.assetTokenAddress;
  const revenueTokenAddress = vehicle.revenueTokenAddress;

  const handleInvest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent Link navigation
    onInvest?.(vehicle._id);
  };

  // Days left from campaign endDate
  const endDate = (fundraising as any).endDate;
  const daysLeft = endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <Link href={`/${basePath}/vehicle/${vehicle._id}`}>
      <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer ${className}`}>
        {/* Vehicle Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={vehicle.image || "/assets/car_image1.png"}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/assets/car_image1.png"; }}
          />
          <div className="absolute top-4 left-4">
            <Badge variant="default" className="shadow-lg">
              {fundingPercentage.toFixed(0)}% Funded
            </Badge>
          </div>
          <div className="absolute top-4 right-4">
            <Badge variant="success" className="shadow-lg">
              {fundraising.expectedROI}% ROI
            </Badge>
          </div>
        </div>

        <CardContent className="p-6">
          {/* Vehicle Info */}
          <div className="mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {vehicle.brand} {vehicle.model}
                </h3>
                <p className="text-sm text-gray-600">
                  {vehicle.year} · {vehicle.category} · {vehicle.location}
                </p>
              </div>
              {/* Blockchain Status Badge */}
              {hasBlockchainData && assetTokenAddress && (
                <Badge variant="success" className="ml-2">
                  ⛓️ On-Chain
                </Badge>
              )}
            </div>

            {/* Token Addresses (if deployed) */}
            {hasBlockchainData && (assetTokenAddress || revenueTokenAddress) && (
              <div className="mt-3 p-2 bg-gray-50 rounded-lg space-y-1">
                {assetTokenAddress && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-gray-700">Asset Token:</span>
                    <code className="text-gray-600 font-mono">
                      {assetTokenAddress.slice(0, 6)}...{assetTokenAddress.slice(-4)}
                    </code>
                  </div>
                )}
                {revenueTokenAddress && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-gray-700">Revenue Token:</span>
                    <code className="text-gray-600 font-mono">
                      {revenueTokenAddress.slice(0, 6)}...{revenueTokenAddress.slice(-4)}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Funding Progress */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Funding Progress</span>
              <span className="font-semibold">
                {formatCurrency(effectiveRaised)} / {formatCurrency(fundraising.targetAmount)}
              </span>
            </div>
            <Progress value={fundingPercentage} variant="default" />
          </div>

          {/* Investment Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600">Remaining</p>
              <p className="text-lg font-semibold text-primary">
                {formatCurrency(remainingAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Days Left</p>
              <p className="text-lg font-semibold text-gray-900">
                {daysLeft > 0 ? `${daysLeft} days` : "Ending soon"}
              </p>
            </div>
          </div>

          {/* Expected Returns */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Expected Annual Return</p>
            <p className="text-2xl font-bold text-blue-600">
              {fundraising.expectedROI}%
            </p>
          </div>
        </CardContent>

        <CardFooter className="p-6 pt-0">
          <Button
            onClick={handleInvest}
            className="w-full"
          >
            {basePath === "rentor" ? "Manage Campaign" : "Invest Now"}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

// Skeleton loader
export function InvestmentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-48 bg-gray-200 animate-pulse" />
      <CardContent className="p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="h-2 bg-gray-200 rounded animate-pulse w-full" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
