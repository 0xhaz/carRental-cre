"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Input, Badge, Separator } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useEscrowDetails,
  useEscrowBalance,
  useEscrowByPayment,
  useIsEscrowExpired,
  useAvailableEscrowFees,
  useAvailableRentalEscrowFees,
  useRentalEscrowDetails,
  useRentalEscrowBalance,
  useRentalEscrowByPayment,
  useIsRentalEscrowExpired,
  useProcessExpiredEscrow,
  useBatchProcessExpiredEscrows,
  useWithdrawEscrowFees,
  useEmergencyRefundEscrow,
  useProcessExpiredRentalEscrow,
  useBatchProcessExpiredRentalEscrows,
  ESCROW_STATE_LABELS,
} from "@/hooks/useEscrow";
import { formatEther, parseEther } from "viem";
import { toast } from "react-hot-toast";

function EscrowCard({ escrowId, mode }: { escrowId: bigint; mode: "investment" | "rental" }) {
  const isInv = mode === "investment";
  const { data: invDetails } = useEscrowDetails(isInv ? escrowId : undefined);
  const { data: rentalDetails } = useRentalEscrowDetails(!isInv ? escrowId : undefined);
  const { formatted: invBalance } = useEscrowBalance(isInv ? escrowId : undefined);
  const { formatted: rentalBalance } = useRentalEscrowBalance(!isInv ? escrowId : undefined);
  const { data: invExpired } = useIsEscrowExpired(isInv ? escrowId : undefined);
  const { data: rentalExpired } = useIsRentalEscrowExpired(!isInv ? escrowId : undefined);

  const details = isInv ? invDetails : rentalDetails;
  const balance = isInv ? invBalance : rentalBalance;
  const isExpired = isInv ? invExpired : rentalExpired;

  const processInv = useProcessExpiredEscrow();
  const processRental = useProcessExpiredRentalEscrow();
  const processExpired = isInv ? processInv : processRental;
  const emergencyRefund = useEmergencyRefundEscrow();

  useEffect(() => { if (processExpired.isSuccess) toast.success("Expired escrow processed!"); }, [processExpired.isSuccess]);
  useEffect(() => { if (emergencyRefund.isSuccess) toast.success("Emergency refund executed!"); }, [emergencyRefund.isSuccess]);

  if (!details) return <div className="h-24 bg-gray-100 rounded animate-pulse" />;

  const d = details as any;
  const state = Number(d[3] ?? d.state ?? 0);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Heading as="h4" className="text-sm">Escrow #{Number(escrowId)}</Heading>
          <div className="flex gap-2">
            {Boolean(isExpired) && <Badge variant="error">Expired</Badge>}
            <Badge variant={state === 0 ? "info" : state === 1 ? "success" : state === 2 ? "warning" : "error"}>
              {ESCROW_STATE_LABELS[state] || `State ${state}`}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <span className="text-gray-500">Balance</span>
            <p className="font-bold text-blue-600">{balance} ETH</p>
          </div>
          <div>
            <span className="text-gray-500">Payment ID</span>
            <p className="font-mono">#{d[1] ? Number(d[1]) : "—"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          {Boolean(isExpired) && state === 0 && (
            <Button size="sm" onClick={() => processExpired.processExpired(escrowId)} disabled={processExpired.isPending || processExpired.isConfirming}>
              {processExpired.isPending ? "Confirm..." : "Process Expired"}
            </Button>
          )}
          {state === 0 && isInv && (
            <Button size="sm" variant="outline" onClick={() => emergencyRefund.emergencyRefund(escrowId)} disabled={emergencyRefund.isPending || emergencyRefund.isConfirming}>
              Emergency Refund
            </Button>
          )}
          {processExpired.hash && <ExplorerLink value={processExpired.hash} type="tx" label="View tx" className="text-xs" />}
          {emergencyRefund.hash && <ExplorerLink value={emergencyRefund.hash} type="tx" label="View tx" className="text-xs" />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EscrowManagement() {
  const [mode, setMode] = useState<"investment" | "rental">("investment");
  const [lookupType, setLookupType] = useState<"escrow" | "payment">("escrow");
  const [idInput, setIdInput] = useState("");
  const [searchEscrowId, setSearchEscrowId] = useState<bigint | undefined>();
  const [searchPaymentId, setSearchPaymentId] = useState<bigint | undefined>();

  // Batch processing
  const [batchIds, setBatchIds] = useState("");

  // Fee withdrawal
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const isInv = mode === "investment";
  const { formatted: invFees, refetch: refetchInvFees } = useAvailableEscrowFees();
  const { formatted: rentalFees, refetch: refetchRentalFees } = useAvailableRentalEscrowFees();

  const { data: invEscrowByPayment } = useEscrowByPayment(isInv ? searchPaymentId : undefined);
  const { data: rentalEscrowByPayment } = useRentalEscrowByPayment(!isInv ? searchPaymentId : undefined);
  const escrowIdFromPayment = isInv ? invEscrowByPayment : rentalEscrowByPayment;

  const batchInv = useBatchProcessExpiredEscrows();
  const batchRental = useBatchProcessExpiredRentalEscrows();
  const batch = isInv ? batchInv : batchRental;

  const withdrawFees = useWithdrawEscrowFees();

  useEffect(() => { if (batch.isSuccess) toast.success("Batch expired processing complete!"); }, [batch.isSuccess]);
  useEffect(() => { if (withdrawFees.isSuccess) { toast.success("Fees withdrawn!"); refetchInvFees(); setWithdrawAmount(""); } }, [withdrawFees.isSuccess]);

  const handleSearch = () => {
    if (!idInput.trim()) return;
    const id = BigInt(idInput);
    if (lookupType === "escrow") {
      setSearchEscrowId(id);
      setSearchPaymentId(undefined);
    } else {
      setSearchPaymentId(id);
      setSearchEscrowId(undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Fee Overview */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">Escrow Management</Heading>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600">Investment Escrow Fees</p>
              <p className="text-xl font-bold text-blue-700">{invFees} ETH</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600">Rental Escrow Fees</p>
              <p className="text-xl font-bold text-green-700">{rentalFees} ETH</p>
            </div>
          </div>

          {/* Fee Withdrawal */}
          <Separator className="my-4" />
          <p className="text-sm font-medium mb-2">Withdraw Investment Escrow Fees</p>
          <div className="flex gap-3 mb-3">
            <Input type="text" value={withdrawRecipient} onChange={(e) => setWithdrawRecipient(e.target.value)} placeholder="Recipient 0x..." className="flex-1" />
            <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Amount ETH" className="w-40" min={0} step="0.001" />
            <Button
              onClick={() => withdrawFees.withdrawFees(withdrawRecipient as `0x${string}`, parseEther(withdrawAmount))}
              disabled={withdrawFees.isPending || withdrawFees.isConfirming || !withdrawRecipient || !withdrawAmount}
            >
              Withdraw
            </Button>
          </div>
          {withdrawFees.hash && <ExplorerLink value={withdrawFees.hash} type="tx" label="View tx" className="text-xs" />}
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">Escrow Lookup</p>
            <div className="flex gap-2">
              <Button variant={isInv ? "default" : "outline"} size="sm" onClick={() => setMode("investment")}>Investment</Button>
              <Button variant={!isInv ? "default" : "outline"} size="sm" onClick={() => setMode("rental")}>Rental</Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select value={lookupType} onChange={(e) => setLookupType(e.target.value as "escrow" | "payment")} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="escrow">By Escrow ID</option>
              <option value="payment">By Payment ID</option>
            </select>
            <Input type="number" value={idInput} onChange={(e) => setIdInput(e.target.value)} placeholder="ID" className="max-w-xs" />
            <Button onClick={handleSearch} disabled={!idInput.trim()}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {searchEscrowId !== undefined && <EscrowCard escrowId={searchEscrowId} mode={mode} />}

      {searchPaymentId !== undefined && escrowIdFromPayment !== undefined && (
        <EscrowCard escrowId={escrowIdFromPayment as bigint} mode={mode} />
      )}

      {/* Batch Process */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-medium mb-3">Batch Process Expired Escrows</p>
          <div className="flex gap-3">
            <Input type="text" value={batchIds} onChange={(e) => setBatchIds(e.target.value)} placeholder="Escrow IDs (comma-separated)" className="flex-1" />
            <Button
              onClick={() => {
                const ids = batchIds.split(",").map(s => BigInt(s.trim())).filter(Boolean);
                if (ids.length === 0) { toast.error("Enter escrow IDs"); return; }
                batch.batchProcess(ids);
              }}
              disabled={batch.isPending || batch.isConfirming || !batchIds}
            >
              {batch.isPending ? "Confirm..." : batch.isConfirming ? "Processing..." : "Batch Process"}
            </Button>
          </div>
          {batch.hash && <ExplorerLink value={batch.hash} type="tx" label="View tx" className="text-xs mt-2" />}
        </CardContent>
      </Card>
    </div>
  );
}
