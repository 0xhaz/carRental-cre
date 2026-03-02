"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Input, Badge, Separator } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useRefundRequest,
  useRefundsByPayment,
  useApproveRefund,
  useRejectRefund,
  useProcessRefund,
  useEmergencyRefund,
  useRentalRefundRequest,
  useRentalRefundsByPayment,
  useApproveRentalRefund,
  useRejectRentalRefund,
  useProcessRentalRefund,
  useEmergencyRentalRefund,
  REFUND_TYPE_LABELS,
  REFUND_REASON_LABELS,
} from "@/hooks/useRefunds";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";

const REFUND_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Approved",
  2: "Rejected",
  3: "Processed",
  4: "Cancelled",
};

function RefundCard({ refundId, mode }: { refundId: bigint; mode: "investment" | "rental" }) {
  const isInvestment = mode === "investment";
  const { data: invRequest } = useRefundRequest(isInvestment ? refundId : undefined);
  const { data: rentalRequest } = useRentalRefundRequest(!isInvestment ? refundId : undefined);
  const request = isInvestment ? invRequest : rentalRequest;

  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [emergencyPaymentId, setEmergencyPaymentId] = useState("");
  const [emergencyRecipient, setEmergencyRecipient] = useState("");
  const [emergencyReason, setEmergencyReason] = useState("4");
  const [emergencyDesc, setEmergencyDesc] = useState("");

  const approveInv = useApproveRefund();
  const rejectInv = useRejectRefund();
  const processInv = useProcessRefund();
  const approveRental = useApproveRentalRefund();
  const rejectRental = useRejectRentalRefund();
  const processRental = useProcessRentalRefund();

  const approve = isInvestment ? approveInv : approveRental;
  const reject = isInvestment ? rejectInv : rejectRental;
  const process = isInvestment ? processInv : processRental;

  useEffect(() => { if (approve.isSuccess) toast.success("Refund approved!"); }, [approve.isSuccess]);
  useEffect(() => { if (reject.isSuccess) { toast.success("Refund rejected"); setShowReject(false); } }, [reject.isSuccess]);
  useEffect(() => { if (process.isSuccess) toast.success("Refund processed!"); }, [process.isSuccess]);

  if (!request) return <div className="h-24 bg-gray-100 rounded animate-pulse" />;

  const r = request as any;
  const status = Number(r[4] ?? r.status ?? 0);
  const refundType = Number(r[2] ?? 0);
  const reason = Number(r[3] ?? 0);
  const amount = r[6] ?? r.amount;
  const canApprove = status === 0;
  const canProcess = status === 1;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Heading as="h4" className="text-sm">Refund #{Number(refundId)}</Heading>
          <div className="flex gap-2">
            <Badge variant={status === 3 ? "success" : status === 2 ? "error" : "warning"}>
              {REFUND_STATUS_LABELS[status] || `Status ${status}`}
            </Badge>
            <Badge variant="info">{REFUND_TYPE_LABELS[refundType] || `Type ${refundType}`}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <span className="text-gray-500">Reason</span>
            <p>{REFUND_REASON_LABELS[reason] || `Reason ${reason}`}</p>
          </div>
          <div>
            <span className="text-gray-500">Amount</span>
            <p className="font-mono">{amount ? formatEther(amount as bigint) : "—"} ETH</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          {canApprove && (
            <>
              <Button size="sm" onClick={() => approve.approveRefund(refundId)} disabled={approve.isPending || approve.isConfirming}>
                {approve.isPending ? "Confirm..." : approve.isConfirming ? "Approving..." : "Approve"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReject(!showReject)}>Reject</Button>
            </>
          )}
          {canProcess && (
            <Button size="sm" onClick={() => process.processRefund(refundId)} disabled={process.isPending || process.isConfirming}>
              {process.isPending ? "Confirm..." : process.isConfirming ? "Processing..." : "Process Refund"}
            </Button>
          )}
          {approve.hash && <ExplorerLink value={approve.hash} type="tx" label="View tx" className="text-xs" />}
          {process.hash && <ExplorerLink value={process.hash} type="tx" label="View tx" className="text-xs" />}
        </div>

        {showReject && canApprove && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg space-y-2">
            <Input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason" />
            <Button size="sm" onClick={() => reject.rejectRefund(refundId, rejectReason)} disabled={reject.isPending || reject.isConfirming || !rejectReason} className="w-full">
              Confirm Rejection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RefundManagement() {
  const [mode, setMode] = useState<"investment" | "rental">("investment");
  const [lookupType, setLookupType] = useState<"refund" | "payment">("refund");
  const [idInput, setIdInput] = useState("");
  const [searchRefundId, setSearchRefundId] = useState<bigint | undefined>();
  const [searchPaymentId, setSearchPaymentId] = useState<bigint | undefined>();

  // Emergency refund
  const [emergencyPaymentId, setEmergencyPaymentId] = useState("");
  const [emergencyRecipient, setEmergencyRecipient] = useState("");
  const [emergencyReason, setEmergencyReason] = useState("4");
  const [emergencyDesc, setEmergencyDesc] = useState("");

  const isInvestment = mode === "investment";
  const { data: invByPayment } = useRefundsByPayment(isInvestment ? searchPaymentId : undefined);
  const { data: rentalByPayment } = useRentalRefundsByPayment(!isInvestment ? searchPaymentId : undefined);
  const refundIds = ((isInvestment ? invByPayment : rentalByPayment) as bigint[]) || [];

  const emergencyInv = useEmergencyRefund();
  const emergencyRental = useEmergencyRentalRefund();
  const emergency = isInvestment ? emergencyInv : emergencyRental;

  useEffect(() => {
    if (emergency.isSuccess) toast.success("Emergency refund executed!");
  }, [emergency.isSuccess]);

  const handleSearch = () => {
    if (!idInput.trim()) return;
    const id = BigInt(idInput);
    if (lookupType === "refund") {
      setSearchRefundId(id);
      setSearchPaymentId(undefined);
    } else {
      setSearchPaymentId(id);
      setSearchRefundId(undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading as="h3">Refund Management</Heading>
            <div className="flex gap-2">
              <Button variant={isInvestment ? "default" : "outline"} size="sm" onClick={() => setMode("investment")}>Investment</Button>
              <Button variant={!isInvestment ? "default" : "outline"} size="sm" onClick={() => setMode("rental")}>Rental</Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select value={lookupType} onChange={(e) => setLookupType(e.target.value as "refund" | "payment")} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="refund">By Refund ID</option>
              <option value="payment">By Payment ID</option>
            </select>
            <Input type="number" value={idInput} onChange={(e) => setIdInput(e.target.value)} placeholder="ID" className="max-w-xs" />
            <Button onClick={handleSearch} disabled={!idInput.trim()}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {searchRefundId !== undefined && <RefundCard refundId={searchRefundId} mode={mode} />}

      {searchPaymentId !== undefined && (
        <div className="space-y-4">
          <Heading as="h4">Refunds for Payment #{Number(searchPaymentId)}</Heading>
          {refundIds.length === 0 ? (
            <Card><CardContent className="p-6 text-center"><p className="text-sm text-gray-500">No refunds found</p></CardContent></Card>
          ) : (
            refundIds.map((id) => <RefundCard key={id.toString()} refundId={id} mode={mode} />)
          )}
        </div>
      )}

      {/* Emergency Refund */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h4" className="text-sm mb-3">Emergency Refund</Heading>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input type="number" label="Payment ID" value={emergencyPaymentId} onChange={(e) => setEmergencyPaymentId(e.target.value)} placeholder="1" />
            <Input type="text" label="Recipient" value={emergencyRecipient} onChange={(e) => setEmergencyRecipient(e.target.value)} placeholder="0x..." />
            <Input type="number" label="Reason Code" value={emergencyReason} onChange={(e) => setEmergencyReason(e.target.value)} placeholder="4" />
            <Input type="text" label="Description" value={emergencyDesc} onChange={(e) => setEmergencyDesc(e.target.value)} placeholder="Emergency action..." />
          </div>
          <Button
            onClick={() => emergency.emergencyRefund(BigInt(emergencyPaymentId), emergencyRecipient as `0x${string}`, parseInt(emergencyReason), emergencyDesc)}
            disabled={emergency.isPending || emergency.isConfirming || !emergencyPaymentId || !emergencyRecipient}
            className="w-full"
          >
            {emergency.isPending ? "Confirm..." : emergency.isConfirming ? "Processing..." : "Execute Emergency Refund"}
          </Button>
          {emergency.hash && <ExplorerLink value={emergency.hash} type="tx" label="View tx" className="text-xs" />}
        </CardContent>
      </Card>
    </div>
  );
}
