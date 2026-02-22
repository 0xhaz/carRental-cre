"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Input, Separator } from "@/components/ui";
import {
  useAddRevenue,
  useDistributeRevenue,
  useVehicleRevenue,
  useRevenueWaterfall,
  useMaintenanceReserve,
  useWithdrawMaintenanceReserve,
} from "@/hooks/useInvestment";
import { parseEther, formatEther } from "viem";
import { toast } from "react-hot-toast";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";
import { investmentApi } from "@/lib/api";
import { useEthPrice } from "@/hooks/usePriceFeed";
import { useAccount } from "wagmi";

interface RevenueAdminProps {
  vehicleId: bigint;
}

export default function RevenueAdmin({ vehicleId }: RevenueAdminProps) {
  const [addAmount, setAddAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const { price: ethPrice } = useEthPrice();
  const { address: adminAddress } = useAccount();
  const { data: vehicleRevenue, refetch: refetchRevenue } = useVehicleRevenue(vehicleId);
  const { data: maintenanceReserveData, formatted: maintenanceFormatted, refetch: refetchMaintenance } = useMaintenanceReserve(vehicleId);

  const amountWei = addAmount && parseFloat(addAmount) > 0 ? parseEther(addAmount) : undefined;
  const { data: waterfallData } = useRevenueWaterfall(amountWei);

  const {
    addRevenue,
    hash: addHash,
    isConfirming: isAddConfirming,
    isSuccess: addSuccess,
    isPending: isAddPending,
    error: addError,
  } = useAddRevenue();

  const {
    distributeRevenue,
    hash: distHash,
    isConfirming: isDistConfirming,
    isSuccess: distSuccess,
    isPending: isDistPending,
    error: distError,
  } = useDistributeRevenue();

  const {
    withdraw: withdrawMaintenance,
    hash: withdrawHash,
    isConfirming: isWithdrawConfirming,
    isSuccess: withdrawSuccess,
    isPending: isWithdrawPending,
    error: withdrawError,
  } = useWithdrawMaintenanceReserve();

  const [lastAddedAmount, setLastAddedAmount] = useState("");

  useEffect(() => {
    if (addSuccess && addHash) {
      toast.success("Revenue added!");
      // Sync to DB (convert ETH → USD for dashboard display)
      const ethAmount = parseFloat(lastAddedAmount);
      if (ethAmount > 0) {
        const usdAmount = ethPrice > 0 ? ethAmount * ethPrice : 0;
        investmentApi.recordRevenueDistributed(vehicleId.toString(), {
          amountEth: ethAmount,
          amountUsd: usdAmount,
          txHash: addHash,
        }).catch((err) => console.error("Failed to sync revenue to DB:", err));
      }
      setAddAmount("");
      refetchRevenue();
    }
  }, [addSuccess, addHash]);

  useEffect(() => {
    if (distSuccess) {
      toast.success("Revenue distributed!");
      refetchRevenue();
    }
  }, [distSuccess]);

  useEffect(() => {
    if (addError) toast.error(addError.message?.slice(0, 100) || "Failed to add revenue");
  }, [addError]);

  useEffect(() => {
    if (distError) toast.error(distError.message?.slice(0, 100) || "Failed to distribute revenue");
  }, [distError]);

  useEffect(() => {
    if (withdrawSuccess && withdrawHash) {
      toast.success("Maintenance reserve withdrawn!");
      setWithdrawAmount("");
      setWithdrawRecipient("");
      refetchMaintenance();
      refetchRevenue();
    }
  }, [withdrawSuccess, withdrawHash]);

  useEffect(() => {
    if (withdrawError) toast.error(withdrawError.message?.slice(0, 100) || "Failed to withdraw maintenance");
  }, [withdrawError]);

  // Parse vehicle revenue data
  const revenue = vehicleRevenue as any;
  const accumulated = revenue?.accumulatedRevenue ? formatEther(revenue.accumulatedRevenue as bigint) : "0";
  const totalDistributed = revenue?.totalDistributed ? formatEther(revenue.totalDistributed as bigint) : "0";
  const distributionCount = revenue?.distributionCount ? Number(revenue.distributionCount) : 0;

  // Parse waterfall preview
  const waterfall = waterfallData as any;

  return (
    <Card>
      <CardContent className="p-6">
        <Heading as="h3" className="mb-4">
          Revenue Management — Vehicle #{vehicleId.toString()}
        </Heading>

        {/* Revenue Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600">Accumulated</p>
            <p className="text-lg font-bold text-blue-700">{accumulated} ETH</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600">Total Distributed</p>
            <p className="text-lg font-bold text-green-700">{totalDistributed} ETH</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600">Distributions</p>
            <p className="text-lg font-bold text-purple-700">{distributionCount}</p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Add Revenue */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium">Add Revenue</p>
          <Input
            type="number"
            label="Amount (ETH)"
            placeholder="0.1"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            min={0}
            step="0.001"
          />

          {waterfall && addAmount && parseFloat(addAmount) > 0 && (() => {
            const wf = waterfall as any;
            return (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs">
                <p className="font-medium text-gray-700 mb-2">Waterfall Preview:</p>
                <div className="flex justify-between"><span>Platform Fee (15%)</span><span>{wf.platformFee ? formatEther(wf.platformFee as bigint) : "—"} ETH</span></div>
                <div className="flex justify-between"><span>Maintenance (10%)</span><span>{wf.maintenanceReserve ? formatEther(wf.maintenanceReserve as bigint) : "—"} ETH</span></div>
                <div className="flex justify-between"><span>Insurance (5%) — Rentor</span><span>{wf.insuranceFee ? formatEther(wf.insuranceFee as bigint) : "—"} ETH</span></div>
                <div className="flex justify-between"><span>Operating (10%) — Rentor</span><span>{wf.operatingCosts ? formatEther(wf.operatingCosts as bigint) : "—"} ETH</span></div>
                <div className="flex justify-between"><span>Operator Fee (10%) — Rentor</span><span>{wf.operatorFee ? formatEther(wf.operatorFee as bigint) : "—"} ETH</span></div>
                <div className="flex justify-between font-medium"><span>Net to Investors (50%)</span><span>{wf.netDistributable ? formatEther(wf.netDistributable as bigint) : "—"} ETH</span></div>
              </div>
            );
          })()}

          <Button
            onClick={() => {
              if (!addAmount || parseFloat(addAmount) <= 0) {
                toast.error("Enter a valid amount");
                return;
              }
              setLastAddedAmount(addAmount);
              addRevenue(vehicleId, parseEther(addAmount));
            }}
            disabled={isAddPending || isAddConfirming || !addAmount}
            className="w-full"
          >
            {isAddPending ? "Confirm in Wallet..." : isAddConfirming ? "Adding Revenue..." : "Add Revenue"}
          </Button>

          {addHash && (
            <a href={getEtherscanUrl(SEPOLIA_CHAIN_ID, addHash, "tx")} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
              Tx: {addHash.slice(0, 14)}...
            </a>
          )}
        </div>

        <Separator className="my-4" />

        {/* Distribute Revenue */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Distribute Revenue</p>
          <p className="text-xs text-gray-600">
            Distributes accumulated revenue through the waterfall to all token holders.
          </p>
          <Button
            onClick={() => distributeRevenue(vehicleId)}
            disabled={isDistPending || isDistConfirming || accumulated === "0"}
            className="w-full"
            variant="outline"
          >
            {isDistPending ? "Confirm in Wallet..." : isDistConfirming ? "Distributing..." : "Distribute Revenue"}
          </Button>
          {distHash && (
            <a href={getEtherscanUrl(SEPOLIA_CHAIN_ID, distHash, "tx")} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
              Tx: {distHash.slice(0, 14)}...
            </a>
          )}
        </div>

        <Separator className="my-4" />

        {/* Withdraw Maintenance Reserve */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Maintenance Reserve</p>
            <p className="text-lg font-bold text-purple-700">{maintenanceFormatted} ETH</p>
          </div>
          <p className="text-xs text-gray-600">
            The 10% maintenance reserve can be withdrawn by admin to cover vehicle maintenance costs.
          </p>
          <Input
            type="text"
            label="Recipient Address"
            placeholder={adminAddress || "0x..."}
            value={withdrawRecipient}
            onChange={(e) => setWithdrawRecipient(e.target.value)}
          />
          <Input
            type="number"
            label="Amount (ETH)"
            placeholder="0.01"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            min={0}
            step="0.001"
            max={maintenanceFormatted}
          />
          <Button
            onClick={() => {
              if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
                toast.error("Enter a valid amount");
                return;
              }
              const recipient = (withdrawRecipient || adminAddress) as `0x${string}`;
              if (!recipient) {
                toast.error("Connect your wallet or enter a recipient address");
                return;
              }
              withdrawMaintenance(vehicleId, recipient, parseEther(withdrawAmount));
            }}
            disabled={isWithdrawPending || isWithdrawConfirming || !withdrawAmount || maintenanceFormatted === "0"}
            className="w-full"
            variant="outline"
          >
            {isWithdrawPending ? "Confirm in Wallet..." : isWithdrawConfirming ? "Withdrawing..." : "Withdraw Maintenance"}
          </Button>
          {withdrawHash && (
            <a href={getEtherscanUrl(SEPOLIA_CHAIN_ID, withdrawHash, "tx")} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
              Tx: {withdrawHash.slice(0, 14)}...
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
