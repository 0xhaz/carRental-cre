"use client";

import { useEffect } from "react";
import { Card, CardContent, Heading, Button } from "@/components/ui";
import { useOperatorFees, useWithdrawOperatorFees } from "@/hooks/useInvestment";
import { toast } from "react-hot-toast";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";

interface OperatorFeeCardProps {
  vehicleId: bigint;
  vehicleName: string;
}

export default function OperatorFeeCard({ vehicleId, vehicleName }: OperatorFeeCardProps) {
  const { formatted: fees, refetch } = useOperatorFees(vehicleId);
  const {
    withdrawFees,
    hash,
    isConfirming,
    isSuccess,
    isPending,
    error,
  } = useWithdrawOperatorFees();

  useEffect(() => {
    if (isSuccess) {
      toast.success("Operator fees withdrawn!");
      refetch();
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error) {
      toast.error(error.message?.slice(0, 100) || "Failed to withdraw fees");
    }
  }, [error]);

  const hasFees = fees !== "0" && parseFloat(fees) > 0;

  return (
    <Card className="mt-4">
      <CardContent className="p-6">
        <Heading as="h3" className="mb-4">
          Operator Fees
        </Heading>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Your accumulated operator fees for {vehicleName} from revenue distributions.
          </p>

          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-600">Available to Withdraw</p>
            <p className="text-2xl font-bold text-indigo-700">{fees} ETH</p>
          </div>

          <Button
            onClick={() => withdrawFees(vehicleId)}
            disabled={isPending || isConfirming || !hasFees}
            className="w-full"
          >
            {isPending
              ? "Confirm in Wallet..."
              : isConfirming
              ? "Withdrawing..."
              : !hasFees
              ? "No Fees Available"
              : "Withdraw Operator Fees"}
          </Button>

          {hash && (
            <a
              href={getEtherscanUrl(SEPOLIA_CHAIN_ID, hash, "tx")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline block"
            >
              Tx: {hash.slice(0, 14)}...
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
