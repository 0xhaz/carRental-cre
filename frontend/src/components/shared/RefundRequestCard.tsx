"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Input, Badge, Separator } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useMyCanRequestRefund,
  useRequestRefund,
  useRefundAmount,
  useIsRefundEligible,
  useMyRefunds,
  useRefundRequest,
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

function RefundHistoryItem({ refundId }: { refundId: bigint }) {
  const { data: request } = useRefundRequest(refundId);
  const r = request as any;
  if (!r) return null;

  const status = Number(r[4] ?? 0);
  const refundType = Number(r[2] ?? 0);
  const reason = Number(r[3] ?? 0);
  const amount = r[6];

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
      <div className="flex items-center gap-2">
        <span className="font-mono">#{Number(refundId)}</span>
        <Badge variant={status === 3 ? "success" : status === 2 ? "error" : "warning"} className="text-xs">
          {REFUND_STATUS_LABELS[status]}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <span>{REFUND_TYPE_LABELS[refundType]}</span>
        <span className="text-gray-400">|</span>
        <span>{amount ? formatEther(amount as bigint) : "—"} ETH</span>
      </div>
    </div>
  );
}

interface RefundRequestCardProps {
  paymentId?: bigint;
  className?: string;
}

export default function RefundRequestCard({ paymentId, className }: RefundRequestCardProps) {
  const [refundType, setRefundType] = useState("0");
  const [reason, setReason] = useState("0");
  const [description, setDescription] = useState("");
  const [evidenceHash, setEvidenceHash] = useState("");

  const { data: canRequest } = useMyCanRequestRefund(paymentId);
  const { formatted: estimatedAmount } = useRefundAmount(paymentId);
  const { data: isEligible } = useIsRefundEligible(paymentId, parseInt(refundType));
  const { data: myRefunds } = useMyRefunds();

  const requestRefund = useRequestRefund();

  useEffect(() => {
    if (requestRefund.isSuccess) {
      toast.success("Refund request submitted!");
      setDescription("");
      setEvidenceHash("");
    }
  }, [requestRefund.isSuccess]);

  const refundIds = (myRefunds as bigint[]) || [];

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <Heading as="h3" className="mb-4">Request Refund</Heading>

        {paymentId !== undefined && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Payment</p>
              <p className="text-sm font-bold">#{Number(paymentId)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Estimated Refund</p>
              <p className="text-sm font-bold text-green-700">{estimatedAmount} ETH</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${canRequest ? "bg-green-50" : "bg-red-50"}`}>
              <p className="text-xs text-gray-600">Eligible</p>
              <p className={`text-sm font-bold ${canRequest ? "text-green-700" : "text-red-700"}`}>
                {canRequest ? "Yes" : "No"}
              </p>
            </div>
          </div>
        )}

        {/* Request Form */}
        {Boolean(canRequest) && paymentId !== undefined && (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Refund Type</label>
                <select value={refundType} onChange={(e) => setRefundType(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {Object.entries(REFUND_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Reason</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {Object.entries(REFUND_REASON_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe why you need a refund..." />
            <Input label="Evidence Hash (optional)" value={evidenceHash} onChange={(e) => setEvidenceHash(e.target.value)} placeholder="0x..." />

            {isEligible !== undefined && (
              <p className={`text-xs ${isEligible ? "text-green-600" : "text-red-600"}`}>
                {isEligible ? "Eligible for this refund type" : "Not eligible for this refund type"}
              </p>
            )}

            <Button
              onClick={() => requestRefund.requestRefund(
                paymentId,
                parseInt(refundType),
                parseInt(reason),
                description,
                (evidenceHash || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
              )}
              disabled={requestRefund.isPending || requestRefund.isConfirming || !description}
              className="w-full"
            >
              {requestRefund.isPending ? "Confirm in Wallet..." : requestRefund.isConfirming ? "Submitting..." : "Request Refund"}
            </Button>
            {requestRefund.hash && <ExplorerLink value={requestRefund.hash} type="tx" label="View tx" className="text-xs" />}
          </div>
        )}

        {!Boolean(canRequest) && paymentId !== undefined && (
          <p className="text-sm text-gray-500 mb-4">You are not eligible to request a refund for this payment.</p>
        )}

        {/* Refund History */}
        {refundIds.length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="text-sm font-medium mb-3">Your Refund History ({refundIds.length})</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {refundIds.map((id) => (
                <RefundHistoryItem key={id.toString()} refundId={id} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
