"use client";

import { useEffect } from "react";
import { Card, CardContent, Button } from "@/components/ui";
import { EthUsdDisplay } from "@/components/web3";
import { useMyClaimableRevenue, useClaimRevenue } from "@/hooks/useInvestment";
import { toast } from "react-hot-toast";
import { formatEther } from "viem";
import { investmentApi } from "@/lib/api";

interface RevenueClaimCardProps {
  vehicleId: bigint;
  vehicleName: string;
}

/**
 * Shows claimable revenue for a specific vehicle and allows the investor to claim it.
 */
export function RevenueClaimCard({ vehicleId, vehicleName }: RevenueClaimCardProps) {
  const { data, refetch, formatted } = useMyClaimableRevenue(vehicleId);
  const claimableWei = data as bigint | undefined;
  const hasClaimable = claimableWei && claimableWei > BigInt(0);

  const { claimRevenue, isConfirming, isSuccess, hash } = useClaimRevenue();

  useEffect(() => {
    if (isSuccess && hash) {
      toast.success("Revenue claimed successfully!");
      // Sync claimed amount to DB
      if (claimableWei && claimableWei > BigInt(0)) {
        const ethAmount = parseFloat(formatEther(claimableWei));
        investmentApi.recordRevenueClaimed(vehicleId.toString(), {
          amountEth: ethAmount,
          txHash: hash,
        }).catch((err) => console.error("Failed to sync revenue claim to DB:", err));
      }
      refetch();
    }
  }, [isSuccess, hash, refetch]);

  const handleClaim = () => {
    if (!hasClaimable) return;
    claimRevenue(vehicleId);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">{vehicleName}</h4>
            <p className="text-xs text-gray-500 mt-1">Claimable Revenue</p>
            <div className="mt-1">
              {hasClaimable ? (
                <EthUsdDisplay amountWei={claimableWei} primary="ETH" />
              ) : (
                <span className="text-sm text-gray-400">0.0000 ETH</span>
              )}
            </div>
          </div>
          <Button
            onClick={handleClaim}
            disabled={!hasClaimable || isConfirming}
            variant={hasClaimable ? "default" : "outline"}
            size="sm"
          >
            {isConfirming ? "Claiming..." : hasClaimable ? "Claim" : "No Revenue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
