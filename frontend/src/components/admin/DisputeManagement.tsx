"use client";

import { useState } from "react";
import { Card, CardContent, Heading, Paragraph, Badge, Button, Input } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useDisputeDetails,
  useDisputesByPayment,
  useDisputeVoteCounts,
  useEmergencyResolveDispute,
  useCloseDispute,
  DISPUTE_STATE_LABELS,
  DISPUTE_STATE_VARIANTS,
  DISPUTE_OUTCOME_LABELS,
} from "@/hooks/useDisputes";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";
import { investmentApi } from "@/lib/api";

function DisputeCard({ disputeId }: { disputeId: bigint }) {
  const { data: dispute } = useDisputeDetails(disputeId);
  const { data: voteCounts } = useDisputeVoteCounts(disputeId);
  const [showResolve, setShowResolve] = useState(false);
  const [outcome, setOutcome] = useState("1");
  const [refundAmount, setRefundAmount] = useState("");

  const emergency = useEmergencyResolveDispute();
  const close = useCloseDispute();

  if (!dispute) {
    return <div className="h-32 bg-gray-100 rounded animate-pulse" />;
  }

  // DisputeResolver.getDispute returns a tuple
  const d = dispute as [
    bigint,   // disputeId
    bigint,   // paymentId
    string,   // disputer
    string,   // respondent
    number,   // state
    number,   // outcome
    string,   // reason
    string,   // evidenceHash
    bigint,   // filedAt
    bigint,   // reviewDeadline
    bigint,   // resolvedAt
    bigint,   // refundAmount
  ];

  const state = Number(d[4]);
  const outcomeVal = Number(d[5]);
  const filedDate = new Date(Number(d[8]) * 1000);
  const deadline = new Date(Number(d[9]) * 1000);
  const votes = voteCounts as [bigint, bigint] | undefined;
  const canResolve = state === 0 || state === 1;
  const canClose = state === 2;

  const handleEmergencyResolve = () => {
    const refund = refundAmount ? BigInt(refundAmount) : BigInt(0);
    emergency.emergencyResolve(disputeId, parseInt(outcome), refund);
  };

  const handleClose = () => {
    close.closeDispute(disputeId);
  };

  // Sync emergency resolve to DB
  if (emergency.isSuccess && emergency.hash && !emergency.isPending) {
    investmentApi.recordDisputeResolution({
      disputeId: Number(disputeId),
      paymentId: Number(d[1]),
      outcome: parseInt(outcome),
      refundAmount: refundAmount || "0",
      txHash: emergency.hash,
    }).catch((err) => console.error("Failed to sync dispute resolution to DB:", err));
    toast.success(`Dispute #${disputeId} resolved`);
  }
  if (close.isSuccess && !close.isPending) toast.success(`Dispute #${disputeId} closed`);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Heading as="h4" className="text-sm">
            Dispute #{Number(disputeId)}
          </Heading>
          <div className="flex items-center gap-2">
            <Badge variant={DISPUTE_STATE_VARIANTS[state] || "info"}>
              {DISPUTE_STATE_LABELS[state] || `State ${state}`}
            </Badge>
            {outcomeVal > 0 && (
              <Badge variant="info">
                {DISPUTE_OUTCOME_LABELS[outcomeVal] || `Outcome ${outcomeVal}`}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <span className="text-gray-500">Payment ID</span>
            <p className="font-mono">#{Number(d[1])}</p>
          </div>
          <div>
            <span className="text-gray-500">Filed</span>
            <p>{filedDate.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500">Disputer</span>
            <ExplorerLink value={d[2]} type="address" />
          </div>
          <div>
            <span className="text-gray-500">Respondent</span>
            <ExplorerLink value={d[3]} type="address" />
          </div>
        </div>

        <div className="mb-3">
          <span className="text-xs text-gray-500">Reason</span>
          <p className="text-sm text-gray-800">{d[6] || "No reason provided"}</p>
        </div>

        {d[7] && d[7] !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
          <div className="mb-3 text-xs">
            <span className="text-gray-500">Evidence: </span>
            <span className="font-mono text-gray-600 break-all">{d[7]}</span>
          </div>
        )}

        {votes && (
          <div className="flex items-center gap-4 mb-3 text-sm">
            <span className="text-gray-500">Votes:</span>
            <span className="text-green-600">Payer: {Number(votes[0])}</span>
            <span className="text-blue-600">Payee: {Number(votes[1])}</span>
          </div>
        )}

        <div className="text-xs text-gray-500 mb-3">
          Review deadline: {deadline.toLocaleString()}
          {d[11] > BigInt(0) && ` | Refund: ${formatEther(d[11])} ETH`}
        </div>

        {/* Admin Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {canResolve && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowResolve(!showResolve)}
            >
              Emergency Resolve
            </Button>
          )}
          {canClose && (
            <Button
              size="sm"
              onClick={handleClose}
              disabled={close.isPending || close.isConfirming}
            >
              {close.isPending || close.isConfirming ? "Closing..." : "Close Dispute"}
            </Button>
          )}
          {emergency.hash && (
            <ExplorerLink value={emergency.hash} type="tx" label="View tx" className="text-xs" />
          )}
          {close.hash && (
            <ExplorerLink value={close.hash} type="tx" label="View tx" className="text-xs" />
          )}
        </div>

        {showResolve && canResolve && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Outcome</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="1">Favor Payer (Full Refund)</option>
                  <option value="2">Favor Payee (No Refund)</option>
                  <option value="3">Partial Refund (50%)</option>
                  <option value="4">Escalated</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Refund Amount (wei)</label>
                <Input
                  type="text"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0"
                  className="text-sm"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleEmergencyResolve}
              disabled={emergency.isPending || emergency.isConfirming}
              className="w-full"
            >
              {emergency.isPending
                ? "Confirm in Wallet..."
                : emergency.isConfirming
                  ? "Confirming..."
                  : "Submit Resolution"}
            </Button>
            {emergency.error && (
              <p className="text-xs text-red-600">
                {(emergency.error as Error).message?.slice(0, 80)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DisputeManagement() {
  const [lookupType, setLookupType] = useState<"dispute" | "payment">("dispute");
  const [idInput, setIdInput] = useState("");
  const [searchDisputeId, setSearchDisputeId] = useState<bigint | undefined>();
  const [searchPaymentId, setSearchPaymentId] = useState<bigint | undefined>();

  const { data: disputeIdsByPayment } = useDisputesByPayment(searchPaymentId);
  const paymentDisputeIds = (disputeIdsByPayment as bigint[]) || [];

  const handleSearch = () => {
    if (!idInput.trim()) return;
    const id = BigInt(idInput);
    if (lookupType === "dispute") {
      setSearchDisputeId(id);
      setSearchPaymentId(undefined);
    } else {
      setSearchPaymentId(id);
      setSearchDisputeId(undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-3">
            Look Up Disputes
          </Heading>
          <div className="flex items-center gap-3">
            <select
              value={lookupType}
              onChange={(e) => setLookupType(e.target.value as "dispute" | "payment")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="dispute">By Dispute ID</option>
              <option value="payment">By Payment ID</option>
            </select>
            <Input
              type="number"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder={lookupType === "dispute" ? "Dispute ID" : "Payment ID"}
              className="max-w-xs"
            />
            <Button onClick={handleSearch} disabled={!idInput.trim()}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single dispute lookup */}
      {searchDisputeId !== undefined && (
        <DisputeCard disputeId={searchDisputeId} />
      )}

      {/* Payment disputes */}
      {searchPaymentId !== undefined && (
        <div className="space-y-4">
          <Heading as="h3">
            Disputes for Payment #{Number(searchPaymentId)}
          </Heading>
          {paymentDisputeIds.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-gray-500">No disputes found for this payment</p>
              </CardContent>
            </Card>
          ) : (
            paymentDisputeIds.map((id) => (
              <DisputeCard key={id.toString()} disputeId={id} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
