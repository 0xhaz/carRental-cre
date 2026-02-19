"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, Button } from "@/components/ui";
import { EthUsdDisplay } from "@/components/web3";
import { useMyClaimableRevenue, useClaimRevenue } from "@/hooks/useInvestment";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { formatEther } from "viem";
import { investmentApi } from "@/lib/api";
import { useEthPrice } from "@/hooks/usePriceFeed";

interface RevenueClaimCardProps {
  vehicleId: bigint;
  vehicleName: string;
}

/**
 * Shows claimable revenue for a specific vehicle and allows the investor to claim it.
 */
export function RevenueClaimCard({ vehicleId, vehicleName }: RevenueClaimCardProps) {
  const { isConnected } = useAccount();
  const { data, refetch, formatted } = useMyClaimableRevenue(vehicleId);
  const claimableWei = data as bigint | undefined;
  const hasClaimable = claimableWei && claimableWei > BigInt(0);
  const { price: ethPrice } = useEthPrice();

  const { claimRevenue, isConfirming, isSuccess, hash } = useClaimRevenue();

  // Capture the claimable amount at claim time — wagmi auto-refetches on-chain data
  // after tx confirms, so claimableWei becomes 0 before the success useEffect fires.
  const pendingClaimRef = useRef<{ wei: bigint; ethPrice: number } | null>(null);

  useEffect(() => {
    if (isSuccess && hash && pendingClaimRef.current) {
      toast.success("Revenue claimed successfully!");
      const { wei, ethPrice: capturedPrice } = pendingClaimRef.current;
      const ethAmount = parseFloat(formatEther(wei));
      const usdAmount = capturedPrice > 0 ? ethAmount * capturedPrice : 0;
      investmentApi.recordRevenueClaimed(vehicleId.toString(), {
        amountEth: ethAmount,
        amountUsd: usdAmount,
        txHash: hash,
      }).catch((err) => console.error("Failed to sync revenue claim to DB:", err));
      pendingClaimRef.current = null;
      refetch();
    }
  }, [isSuccess, hash, refetch, vehicleId]);

  const handleClaim = () => {
    if (!hasClaimable || !claimableWei) return;
    pendingClaimRef.current = { wei: claimableWei, ethPrice };
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
            disabled={!isConnected || !hasClaimable || isConfirming}
            variant={hasClaimable ? "default" : "outline"}
            size="sm"
          >
            {!isConnected ? "Connect Wallet" : isConfirming ? "Claiming..." : hasClaimable ? "Claim" : "No Revenue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
