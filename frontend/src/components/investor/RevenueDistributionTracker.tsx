"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Card, CardContent, Button, Badge, Progress, Separator } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import {
  useMyClaimableRevenue,
  useVehicleRevenue,
  useClaimRevenue,
} from "@/hooks/useInvestment";
import { toast } from "react-hot-toast";
import { formatEther } from "viem";

export interface RevenueDistributionTrackerProps {
  vehicleId: bigint;
  vehicleName?: string;
  totalInvestment?: number;
  className?: string;
}

/**
 * RevenueDistributionTracker Component
 * Tracks and displays revenue distribution for a specific vehicle investment
 * Allows investors to claim their revenue share
 */
export function RevenueDistributionTracker({
  vehicleId,
  vehicleName = "Vehicle",
  totalInvestment = 0,
  className,
}: RevenueDistributionTrackerProps) {
  const { address: userAddress, isConnected } = useAccount();
  const [isClaiming, setIsClaiming] = useState(false);

  // Fetch claimable revenue for this vehicle
  const {
    data: claimableRevenue,
    formatted: claimableFormatted,
    refetch: refetchClaimable,
    isLoading: claimableLoading,
  } = useMyClaimableRevenue(vehicleId);

  // Fetch vehicle revenue info
  const {
    data: vehicleRevenueData,
    refetch: refetchTotal,
    isLoading: totalLoading,
  } = useVehicleRevenue(vehicleId);

  // Extract total distributed from vehicle revenue data
  const totalFormatted = vehicleRevenueData
    ? formatEther((vehicleRevenueData as any).totalRevenue || BigInt(0))
    : "0";

  // Claim revenue hook
  const {
    claimRevenue,
    hash,
    isConfirming,
    isSuccess,
  } = useClaimRevenue();

  // Handle successful claim
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success(`Revenue claimed successfully! Tx: ${hash.slice(0, 10)}...`);
      setIsClaiming(false);
      // Refetch balances
      refetchClaimable();
      refetchTotal();
    }
  }, [isSuccess, hash, refetchClaimable, refetchTotal]);

  // Handle claim button click
  const handleClaim = async () => {
    if (!isConnected || !userAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!claimableRevenue || parseFloat(claimableFormatted) <= 0) {
      toast.error("No revenue available to claim");
      return;
    }

    try {
      setIsClaiming(true);
      claimRevenue(vehicleId);
    } catch (error) {
      console.error("Claim error:", error);
      toast.error("Failed to claim revenue");
      setIsClaiming(false);
    }
  };

  const claimableAmount = parseFloat(claimableFormatted);
  const totalAmount = parseFloat(totalFormatted);
  const hasClaimableRevenue = claimableAmount > 0;
  const estimatedROI = totalInvestment > 0 ? (totalAmount / totalInvestment) * 100 : 0;

  // Loading state
  if (claimableLoading || totalLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
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
            <h3 className="text-xl font-bold text-gray-900">Revenue Distribution</h3>
            {hasClaimableRevenue && (
              <Badge variant="success" className="animate-pulse">
                Claimable
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">{vehicleName}</p>
        </div>

        {/* Claimable Revenue Card */}
        <div
          className={`rounded-lg p-6 mb-6 transition-all ${
            hasClaimableRevenue
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200"
              : "bg-gray-50 border border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Your Claimable Revenue</p>
              <p className={`text-3xl font-bold ${hasClaimableRevenue ? "text-green-600" : "text-gray-400"}`}>
                {formatCurrency(claimableAmount)}
              </p>
            </div>
            {hasClaimableRevenue && (
              <div className="text-5xl">💰</div>
            )}
          </div>

          {/* Claim Button */}
          <Button
            onClick={handleClaim}
            disabled={!hasClaimableRevenue || !isConnected || isConfirming || isClaiming}
            className="w-full"
            variant={hasClaimableRevenue ? "default" : "outline"}
          >
            {isConfirming || isClaiming
              ? "Processing..."
              : hasClaimableRevenue
              ? `Claim ${formatCurrency(claimableAmount)}`
              : "No Revenue to Claim"}
          </Button>
        </div>

        <Separator className="my-6" />

        {/* Revenue Statistics */}
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Revenue Statistics</h4>

          {/* Total Distributed */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Revenue Distributed</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>

          {/* Investment ROI */}
          {totalInvestment > 0 && (
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600 mb-1">Return on Investment</p>
                <p className="text-xl font-bold text-purple-600">
                  {estimatedROI.toFixed(2)}%
                </p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          )}

          {/* Your Investment */}
          {totalInvestment > 0 && (
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600 mb-1">Your Total Investment</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(totalInvestment)}</p>
              </div>
              <div className="text-3xl">💼</div>
            </div>
          )}
        </div>

        {/* Transaction Hash */}
        {hash && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ✅ Transaction submitted:{" "}
              <code className="font-mono text-xs">
                {hash.slice(0, 10)}...{hash.slice(-8)}
              </code>
            </p>
          </div>
        )}

        {/* Wallet Connection Warning */}
        {!isConnected && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Connect your wallet to claim revenue
            </p>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 Revenue is distributed automatically based on your investment share. Claim your
            rewards anytime!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Multi-Vehicle Revenue Tracker
 * Displays revenue distribution across multiple vehicles
 */
export interface MultiVehicleRevenueTrackerProps {
  vehicles: Array<{
    vehicleId: bigint;
    vehicleName: string;
    totalInvestment: number;
  }>;
  className?: string;
}

export function MultiVehicleRevenueTracker({
  vehicles,
  className,
}: MultiVehicleRevenueTrackerProps) {
  const [expandedVehicle, setExpandedVehicle] = useState<bigint | null>(null);

  if (vehicles.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Investments</h3>
          <p className="text-sm text-gray-600">
            Start investing to track revenue distributions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Revenue Distribution Tracker</h2>

      {vehicles.map((vehicle) => (
        <div key={vehicle.vehicleId.toString()}>
          <RevenueDistributionTracker
            vehicleId={vehicle.vehicleId}
            vehicleName={vehicle.vehicleName}
            totalInvestment={vehicle.totalInvestment}
          />
        </div>
      ))}
    </div>
  );
}
