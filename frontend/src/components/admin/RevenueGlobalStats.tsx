"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Input, Separator } from "@/components/ui";
import {
  useTotalDistributed,
  usePlatformFees,
  useWithdrawPlatformFees,
  useIsVehicleRegistered,
  useRegisterVehicle,
  useSetVehicleOperator,
  useBatchDistribute,
  useUpdateFeePercentages,
} from "@/hooks/useInvestment";
import { formatEther, parseEther } from "viem";
import { toast } from "react-hot-toast";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";

export default function RevenueGlobalStats() {
  const { formatted: totalDistributed } = useTotalDistributed();
  const { formatted: platformFees, refetch: refetchFees } = usePlatformFees();

  // Withdraw platform fees
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const withdrawPlatform = useWithdrawPlatformFees();

  // Register vehicle
  const [regVehicleId, setRegVehicleId] = useState("");
  const [regOperator, setRegOperator] = useState("");
  const [regAssetToken, setRegAssetToken] = useState("");
  const [regRevenueToken, setRegRevenueToken] = useState("");
  const registerVehicle = useRegisterVehicle();

  // Check registration
  const [checkVehicleId, setCheckVehicleId] = useState("");
  const checkBigInt = checkVehicleId ? BigInt(checkVehicleId) : undefined;
  const { data: isRegistered } = useIsVehicleRegistered(checkBigInt);

  // Set vehicle operator
  const [opVehicleId, setOpVehicleId] = useState("");
  const [opAddress, setOpAddress] = useState("");
  const setOperator = useSetVehicleOperator();

  // Batch distribute
  const [batchIds, setBatchIds] = useState("");
  const batchDistribute = useBatchDistribute();

  // Update fee percentages
  const [feePlatform, setFeePlatform] = useState("");
  const [feeMaintenance, setFeeMaintenance] = useState("");
  const [feeInsurance, setFeeInsurance] = useState("");
  const [feeOperating, setFeeOperating] = useState("");
  const [feeOperator, setFeeOperator] = useState("");
  const updateFees = useUpdateFeePercentages();

  useEffect(() => {
    if (withdrawPlatform.isSuccess) { toast.success("Platform fees withdrawn!"); refetchFees(); setWithdrawAmount(""); }
  }, [withdrawPlatform.isSuccess]);

  useEffect(() => {
    if (registerVehicle.isSuccess) { toast.success("Vehicle registered on-chain!"); setRegVehicleId(""); }
  }, [registerVehicle.isSuccess]);

  useEffect(() => {
    if (setOperator.isSuccess) toast.success("Vehicle operator set!");
  }, [setOperator.isSuccess]);

  useEffect(() => {
    if (batchDistribute.isSuccess) toast.success("Batch distribution complete!");
  }, [batchDistribute.isSuccess]);

  useEffect(() => {
    if (updateFees.isSuccess) toast.success("Fee percentages updated!");
  }, [updateFees.isSuccess]);

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">Revenue Global Stats</Heading>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600">Total Distributed (All Vehicles)</p>
              <p className="text-xl font-bold text-blue-700">{totalDistributed} ETH</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600">Platform Fees Available</p>
              <p className="text-xl font-bold text-green-700">{platformFees} ETH</p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Withdraw Platform Fees */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Withdraw Platform Fees</p>
            <div className="grid grid-cols-2 gap-3">
              <Input type="text" label="Recipient" placeholder="0x..." value={withdrawRecipient} onChange={(e) => setWithdrawRecipient(e.target.value)} />
              <Input type="number" label="Amount (ETH)" placeholder="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} min={0} step="0.001" />
            </div>
            <Button
              onClick={() => {
                if (!withdrawRecipient || !withdrawAmount) { toast.error("Fill all fields"); return; }
                withdrawPlatform.withdraw(withdrawRecipient as `0x${string}`);
              }}
              disabled={withdrawPlatform.isPending || withdrawPlatform.isConfirming}
              className="w-full"
              variant="outline"
            >
              {withdrawPlatform.isPending ? "Confirm..." : withdrawPlatform.isConfirming ? "Withdrawing..." : "Withdraw Platform Fees"}
            </Button>
            {withdrawPlatform.hash && (
              <a href={getEtherscanUrl(SEPOLIA_CHAIN_ID, withdrawPlatform.hash, "tx")} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                Tx: {withdrawPlatform.hash.slice(0, 14)}...
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Registration */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">Vehicle Registration (RevenueDistributor)</Heading>

          {/* Check registration */}
          <div className="flex items-end gap-3 mb-4">
            <Input type="number" label="Check Vehicle ID" placeholder="1" value={checkVehicleId} onChange={(e) => setCheckVehicleId(e.target.value)} className="flex-1" />
            {checkVehicleId && (
              <p className={`text-sm font-medium pb-2 ${isRegistered ? "text-green-600" : "text-red-600"}`}>
                {isRegistered ? "Registered" : "Not Registered"}
              </p>
            )}
          </div>

          <Separator className="my-4" />

          {/* Register vehicle */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Register Vehicle</p>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" label="Vehicle ID" value={regVehicleId} onChange={(e) => setRegVehicleId(e.target.value)} placeholder="1" />
              <Input type="text" label="Operator" value={regOperator} onChange={(e) => setRegOperator(e.target.value)} placeholder="0x..." />
              <Input type="text" label="AssetToken Address" value={regAssetToken} onChange={(e) => setRegAssetToken(e.target.value)} placeholder="0x..." />
              <Input type="text" label="RevenueToken Address" value={regRevenueToken} onChange={(e) => setRegRevenueToken(e.target.value)} placeholder="0x..." />
            </div>
            <Button
              onClick={() => {
                if (!regVehicleId || !regOperator || !regAssetToken || !regRevenueToken) { toast.error("Fill all fields"); return; }
                registerVehicle.registerVehicle(BigInt(regVehicleId), regRevenueToken as `0x${string}`);
              }}
              disabled={registerVehicle.isPending || registerVehicle.isConfirming}
              className="w-full"
            >
              {registerVehicle.isPending ? "Confirm..." : registerVehicle.isConfirming ? "Registering..." : "Register Vehicle"}
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Set vehicle operator */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Set Vehicle Operator</p>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" label="Vehicle ID" value={opVehicleId} onChange={(e) => setOpVehicleId(e.target.value)} placeholder="1" />
              <Input type="text" label="Operator Address" value={opAddress} onChange={(e) => setOpAddress(e.target.value)} placeholder="0x..." />
            </div>
            <Button
              onClick={() => {
                if (!opVehicleId || !opAddress) { toast.error("Fill all fields"); return; }
                setOperator.setOperator(BigInt(opVehicleId), opAddress as `0x${string}`);
              }}
              disabled={setOperator.isPending || setOperator.isConfirming}
              className="w-full"
              variant="outline"
            >
              {setOperator.isPending ? "Confirm..." : setOperator.isConfirming ? "Setting..." : "Set Operator"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch Distribute & Fee Management */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">Batch Operations & Fee Management</Heading>

          <div className="space-y-3 mb-6">
            <p className="text-sm font-medium">Batch Distribute Revenue</p>
            <Input
              type="text"
              label="Vehicle IDs (comma-separated)"
              value={batchIds}
              onChange={(e) => setBatchIds(e.target.value)}
              placeholder="1,2,3"
            />
            <Button
              onClick={() => {
                const ids = batchIds.split(",").map(s => BigInt(s.trim())).filter(Boolean);
                if (ids.length === 0) { toast.error("Enter vehicle IDs"); return; }
                batchDistribute.batchDistribute(ids);
              }}
              disabled={batchDistribute.isPending || batchDistribute.isConfirming}
              className="w-full"
              variant="outline"
            >
              {batchDistribute.isPending ? "Confirm..." : batchDistribute.isConfirming ? "Distributing..." : "Batch Distribute"}
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <p className="text-sm font-medium">Update Fee Percentages (basis points)</p>
            <div className="grid grid-cols-5 gap-2">
              <Input type="number" label="Platform" value={feePlatform} onChange={(e) => setFeePlatform(e.target.value)} placeholder="1500" />
              <Input type="number" label="Maintenance" value={feeMaintenance} onChange={(e) => setFeeMaintenance(e.target.value)} placeholder="1000" />
              <Input type="number" label="Insurance" value={feeInsurance} onChange={(e) => setFeeInsurance(e.target.value)} placeholder="500" />
              <Input type="number" label="Operating" value={feeOperating} onChange={(e) => setFeeOperating(e.target.value)} placeholder="1000" />
              <Input type="number" label="Operator" value={feeOperator} onChange={(e) => setFeeOperator(e.target.value)} placeholder="1000" />
            </div>
            <Button
              onClick={() => {
                if (!feePlatform || !feeMaintenance || !feeInsurance || !feeOperating || !feeOperator) { toast.error("Fill all fields"); return; }
                updateFees.updateFees(BigInt(feePlatform), BigInt(feeMaintenance), BigInt(feeInsurance), BigInt(feeOperating), BigInt(feeOperator));
              }}
              disabled={updateFees.isPending || updateFees.isConfirming}
              className="w-full"
            >
              {updateFees.isPending ? "Confirm..." : updateFees.isConfirming ? "Updating..." : "Update Fees"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
