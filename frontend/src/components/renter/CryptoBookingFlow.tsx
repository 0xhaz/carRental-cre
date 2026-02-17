"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Button, Separator } from "@/components/ui";
import { useCreateRentalBookingPayment } from "@/hooks/useRentalOperations";
import { useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { toast } from "react-hot-toast";
import { bookingApi } from "@/lib/api";
import { Vehicle } from "@/types";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";

interface CryptoBookingFlowProps {
  vehicle: Vehicle;
  bookingId: string;
  pickupDate: string;
  returnDate: string;
  totalPriceUsd: number;
  onComplete?: (txHash: string) => void;
}

export default function CryptoBookingFlow({
  vehicle,
  bookingId,
  pickupDate,
  returnDate,
  totalPriceUsd,
  onComplete,
}: CryptoBookingFlowProps) {
  const { address: walletAddress } = useAccount();
  const [isSaving, setIsSaving] = useState(false);

  // Simplified: 1 USD = 0.0003 ETH (mock rate for demo)
  const ethRate = 0.0003;
  const rentalFeeEth = (totalPriceUsd * ethRate).toFixed(6);
  const securityDepositEth = (totalPriceUsd * 0.2 * ethRate).toFixed(6); // 20% security deposit
  const escrowFeeEth = (totalPriceUsd * ethRate * 0.001).toFixed(6); // 0.1% escrow fee

  const rentalFeeWei = parseEther(rentalFeeEth);
  const securityDepositWei = parseEther(securityDepositEth);
  const escrowFeeWei = parseEther(escrowFeeEth);
  const totalWei = rentalFeeWei + securityDepositWei + escrowFeeWei;

  const {
    createPayment,
    hash,
    isConfirming,
    isSuccess,
    isPending,
    error,
  } = useCreateRentalBookingPayment();

  // After on-chain success, save txHash to backend
  useEffect(() => {
    if (isSuccess && hash && bookingId) {
      setIsSaving(true);
      bookingApi
        .updateOnChainStatus(bookingId, hash)
        .then(() => {
          toast.success("On-chain payment confirmed!");
          onComplete?.(hash);
        })
        .catch((err: any) => {
          console.error("Save on-chain status error:", err);
          toast.error("Payment confirmed on-chain but failed to update backend");
        })
        .finally(() => setIsSaving(false));
    }
  }, [isSuccess, hash]);

  useEffect(() => {
    if (error) {
      toast.error(error.message?.slice(0, 100) || "On-chain payment failed");
    }
  }, [error]);

  const handlePay = () => {
    if (!walletAddress || !vehicle.vehicleNftId || !vehicle.ownerAddress) {
      toast.error("Vehicle must be registered on-chain and wallet connected");
      return;
    }

    const startTime = BigInt(Math.floor(new Date(pickupDate).getTime() / 1000));
    const endTime = BigInt(Math.floor(new Date(returnDate).getTime() / 1000));

    createPayment(
      BigInt(bookingId.length > 10 ? 0 : parseInt(bookingId)), // Use 0 as fallback for MongoDB IDs
      BigInt(vehicle.vehicleNftId),
      vehicle.ownerAddress as `0x${string}`,
      rentalFeeWei,
      securityDepositWei,
      startTime,
      endTime,
      totalWei,
    );
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardContent className="p-6 space-y-4">
        <h3 className="font-bold text-lg">Pay with ETH</h3>

        <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Rental Fee</span>
            <span className="font-semibold">{rentalFeeEth} ETH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Security Deposit (20%)</span>
            <span className="font-semibold">{securityDepositEth} ETH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Escrow Fee (0.1%)</span>
            <span className="font-semibold">{escrowFeeEth} ETH</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatEther(totalWei)} ETH</span>
          </div>
        </div>

        {hash && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-800 font-medium">Transaction submitted</p>
            <a
              href={getEtherscanUrl(SEPOLIA_CHAIN_ID, hash, "tx")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              View on Etherscan: {hash.slice(0, 18)}...
            </a>
          </div>
        )}

        <Button
          onClick={handlePay}
          disabled={isPending || isConfirming || isSaving || !walletAddress || isSuccess}
          className="w-full"
        >
          {isPending
            ? "Confirm in Wallet..."
            : isConfirming
            ? "Confirming on-chain..."
            : isSaving
            ? "Updating booking..."
            : isSuccess
            ? "Payment Complete"
            : !walletAddress
            ? "Connect Wallet First"
            : `Pay ${formatEther(totalWei)} ETH`}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Funds will be held in the rental escrow smart contract until the rental period ends.
        </p>
      </CardContent>
    </Card>
  );
}
