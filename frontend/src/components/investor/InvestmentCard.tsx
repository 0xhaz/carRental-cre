"use client";

import { Vehicle } from "@/types";
import { Card, CardContent, CardFooter, Button, Badge, Progress } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useVehicleInvestmentInfo } from "@/hooks/useInvestment";
import { formatUnits } from "viem";

export interface InvestmentCardProps {
  vehicle: Vehicle;
  onInvest?: (vehicleId: string) => void;
  className?: string;
  basePath?: string; // e.g., "investor" or "rentor"
}

export function InvestmentCard({ vehicle, onInvest, className, basePath = "investor" }: InvestmentCardProps) {
  const { fundraising } = vehicle;

  // Fetch blockchain investment data
  const { data: investmentInfo, isLoading: isLoadingInvestment } = useVehicleInvestmentInfo(
    vehicle.tokenId ? BigInt(vehicle.tokenId) : undefined
  );

  if (!fundraising || !fundraising.active) {
    return null;
  }

  const fundingPercentage = (fundraising.currentAmount / fundraising.targetAmount) * 100;
  const remainingAmount = fundraising.targetAmount - fundraising.currentAmount;
  // Mock days left (endDate not in FundraisingInfo type yet)
  const daysLeft = Math.floor(Math.random() * 60) + 10;

  // Extract blockchain data if available
  const hasBlockchainData = investmentInfo && !isLoadingInvestment;
  const assetTokenAddress = (vehicle as any).assetTokenAddress as string | undefined;
  const revenueTokenAddress = (vehicle as any).revenueTokenAddress as string | undefined;

  const handleInvest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent Link navigation
    onInvest?.(vehicle._id);
  };

  return (
    <Link href={`/${basePath}/vehicle/${vehicle._id}`}>
      <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer ${className}`}>
        {/* Vehicle Image */}
        <div className="relative h-48 overflow-hidden">
          <Image
            src={vehicle.image || "/assets/car_image1.png"}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover"
            width={400}
            height={300}
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
                {formatCurrency(fundraising.currentAmount)} / {formatCurrency(fundraising.targetAmount)}
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
