"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Badge, Button, Input } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useDisputeDetails,
  useDisputesByPayment,
  useDisputesByDisputer,
  useDisputeVoteCounts,
  useIsDisputeExpired,
  useAssignedOracles,
  useHasOracleVoted,
  useEmergencyResolveDispute,
  useCloseDispute,
  useResolveDispute,
  useAppealDispute,
  useSubmitOracleVote,
  DISPUTE_STATE_LABELS,
  DISPUTE_STATE_VARIANTS,
  DISPUTE_OUTCOME_LABELS,
} from "@/hooks/useDisputes";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";
import { investmentApi } from "@/lib/api";
import { useAccount } from "wagmi";

function OraclePanel({ disputeId }: { disputeId: bigint }) {
  const { address: myAddress } = useAccount();
  const { data: oracles } = useAssignedOracles(disputeId);
  const { data: hasVoted } = useHasOracleVoted(disputeId, myAddress);
  const [favorsPayer, setFavorsPayer] = useState(true);
  const [reasoning, setReasoning] = useState("");

  const vote = useSubmitOracleVote();

  useEffect(() => {
    if (vote.isSuccess) toast.success("Oracle vote submitted");
  }, [vote.isSuccess]);

  const oracleList = (oracles as `0x${string}`[]) || [];

  return (
    <div className="mt-3 p-3 bg-yellow-50 rounded-lg space-y-2">
      <p className="text-xs font-medium text-yellow-800">Oracle Panel</p>
      {oracleList.length > 0 ? (
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-medium">Assigned Oracles:</p>
          {oracleList.map((o, i) => (
            <ExplorerLink key={i} value={o} type="address" className="text-xs block" />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">No oracles assigned</p>
      )}

      {myAddress && oracleList.some(o => o.toLowerCase() === myAddress.toLowerCase()) && !Boolean(hasVoted) && (
        <div className="space-y-2 pt-2 border-t border-yellow-200">
          <p className="text-xs font-medium">Cast Your Vote</p>
          <div className="flex gap-2">
            <Button size="sm" variant={favorsPayer ? "default" : "outline"} onClick={() => setFavorsPayer(true)}>
              Favor Payer
            </Button>
            <Button size="sm" variant={!favorsPayer ? "default" : "outline"} onClick={() => setFavorsPayer(false)}>
              Favor Payee
            </Button>
          </div>
          <Input
            type="text"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Reasoning..."
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={() => vote.submitOracleVote(disputeId, favorsPayer, reasoning)}
            disabled={vote.isPending || vote.isConfirming || !reasoning}
            className="w-full"
          >
            {vote.isPending ? "Confirm..." : vote.isConfirming ? "Submitting..." : "Submit Vote"}
          </Button>
        </div>
      )}
      {Boolean(hasVoted) && <Badge variant="success" className="text-xs">You have voted</Badge>}
    </div>
  );
}

function DisputeCard({ disputeId }: { disputeId: bigint }) {
  const { data: dispute } = useDisputeDetails(disputeId);
  const { data: voteCounts } = useDisputeVoteCounts(disputeId);
  const { data: isExpired } = useIsDisputeExpired(disputeId);
  const [showResolve, setShowResolve] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);
  const [showOracles, setShowOracles] = useState(false);
  const [outcome, setOutcome] = useState("1");
  const [refundAmount, setRefundAmount] = useState("");
  const [appealReason, setAppealReason] = useState("");

  const emergency = useEmergencyResolveDispute();
  const close = useCloseDispute();
  const resolve = useResolveDispute();
  const appeal = useAppealDispute();

  useEffect(() => {
    if (resolve.isSuccess) toast.success(`Dispute #${disputeId} resolved via oracle vote`);
  }, [resolve.isSuccess]);

  useEffect(() => {
    if (appeal.isSuccess) toast.success(`Dispute #${disputeId} appealed`);
  }, [appeal.isSuccess]);

  if (!dispute) {
    return <div className="h-32 bg-gray-100 rounded animate-pulse" />;
  }

  const d = dispute as [
    bigint, bigint, string, string, number, number,
    string, string, bigint, bigint, bigint, bigint,
  ];

  const state = Number(d[4]);
  const outcomeVal = Number(d[5]);
  const filedDate = new Date(Number(d[8]) * 1000);
  const deadline = new Date(Number(d[9]) * 1000);
  const votes = voteCounts as [bigint, bigint] | undefined;
  const canEmergencyResolve = state === 0 || state === 1;
  const canResolve = state === 1;
  const canClose = state === 2;
  const canAppeal = state === 2;

  const handleEmergencyResolve = () => {
    const refund = refundAmount ? BigInt(refundAmount) : BigInt(0);
    emergency.emergencyResolve(disputeId, parseInt(outcome), refund);
  };

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
          <Heading as="h4" className="text-sm">Dispute #{Number(disputeId)}</Heading>
          <div className="flex items-center gap-2">
            {Boolean(isExpired) && <Badge variant="error">Expired</Badge>}
            <Badge variant={DISPUTE_STATE_VARIANTS[state] || "info"}>
              {DISPUTE_STATE_LABELS[state] || `State ${state}`}
            </Badge>
            {outcomeVal > 0 && (
              <Badge variant="info">{DISPUTE_OUTCOME_LABELS[outcomeVal] || `Outcome ${outcomeVal}`}</Badge>
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
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
          {canResolve && (
            <Button size="sm" onClick={() => resolve.resolveDispute(disputeId)} disabled={resolve.isPending || resolve.isConfirming}>
              {resolve.isPending || resolve.isConfirming ? "Resolving..." : "Resolve (Vote)"}
            </Button>
          )}
          {canEmergencyResolve && (
            <Button size="sm" variant="outline" onClick={() => setShowResolve(!showResolve)}>Emergency Resolve</Button>
          )}
          {canAppeal && (
            <Button size="sm" variant="outline" onClick={() => setShowAppeal(!showAppeal)}>Appeal</Button>
          )}
          {canClose && (
            <Button size="sm" onClick={() => close.closeDispute(disputeId)} disabled={close.isPending || close.isConfirming}>
              {close.isPending || close.isConfirming ? "Closing..." : "Close Dispute"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowOracles(!showOracles)}>
            {showOracles ? "Hide" : "Show"} Oracles
          </Button>
          {[emergency, close, resolve, appeal].map((h, i) =>
            h.hash ? <ExplorerLink key={i} value={h.hash} type="tx" label="View tx" className="text-xs" /> : null
          )}
        </div>

        {showOracles && <OraclePanel disputeId={disputeId} />}

        {showResolve && canEmergencyResolve && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Outcome</label>
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="1">Favor Payer (Full Refund)</option>
                  <option value="2">Favor Payee (No Refund)</option>
                  <option value="3">Partial Refund (50%)</option>
                  <option value="4">Escalated</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Refund Amount (wei)</label>
                <Input type="text" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0" className="text-sm" />
              </div>
            </div>
            <Button size="sm" onClick={handleEmergencyResolve} disabled={emergency.isPending || emergency.isConfirming} className="w-full">
              {emergency.isPending ? "Confirm in Wallet..." : emergency.isConfirming ? "Confirming..." : "Submit Resolution"}
            </Button>
            {emergency.error && <p className="text-xs text-red-600">{(emergency.error as Error).message?.slice(0, 80)}</p>}
          </div>
        )}

        {showAppeal && canAppeal && (
          <div className="mt-3 p-3 bg-orange-50 rounded-lg space-y-2">
            <label className="block text-xs text-gray-600 mb-1">Appeal Reason</label>
            <Input type="text" value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="Reason for appeal..." className="text-sm" />
            <Button size="sm" onClick={() => appeal.appealDispute(disputeId, appealReason)} disabled={appeal.isPending || appeal.isConfirming || !appealReason} className="w-full">
              {appeal.isPending ? "Confirm..." : appeal.isConfirming ? "Submitting..." : "Submit Appeal"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DisputeManagement() {
  const [lookupType, setLookupType] = useState<"dispute" | "payment" | "disputer">("dispute");
  const [idInput, setIdInput] = useState("");
  const [searchDisputeId, setSearchDisputeId] = useState<bigint | undefined>();
  const [searchPaymentId, setSearchPaymentId] = useState<bigint | undefined>();
  const [searchDisputer, setSearchDisputer] = useState<string | undefined>();

  const { data: disputeIdsByPayment } = useDisputesByPayment(searchPaymentId);
  const { data: disputeIdsByDisputer } = useDisputesByDisputer(searchDisputer);
  const paymentDisputeIds = (disputeIdsByPayment as bigint[]) || [];
  const disputerDisputeIds = (disputeIdsByDisputer as bigint[]) || [];

  const handleSearch = () => {
    if (!idInput.trim()) return;
    if (lookupType === "dispute") {
      setSearchDisputeId(BigInt(idInput));
      setSearchPaymentId(undefined);
      setSearchDisputer(undefined);
    } else if (lookupType === "payment") {
      setSearchPaymentId(BigInt(idInput));
      setSearchDisputeId(undefined);
      setSearchDisputer(undefined);
    } else {
      setSearchDisputer(idInput);
      setSearchDisputeId(undefined);
      setSearchPaymentId(undefined);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-3">Look Up Disputes</Heading>
          <div className="flex items-center gap-3">
            <select
              value={lookupType}
              onChange={(e) => setLookupType(e.target.value as "dispute" | "payment" | "disputer")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="dispute">By Dispute ID</option>
              <option value="payment">By Payment ID</option>
              <option value="disputer">By Disputer Address</option>
            </select>
            <Input
              type={lookupType === "disputer" ? "text" : "number"}
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder={lookupType === "dispute" ? "Dispute ID" : lookupType === "payment" ? "Payment ID" : "0x..."}
              className="max-w-xs"
            />
            <Button onClick={handleSearch} disabled={!idInput.trim()}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {searchDisputeId !== undefined && <DisputeCard disputeId={searchDisputeId} />}

      {searchPaymentId !== undefined && (
        <div className="space-y-4">
          <Heading as="h3">Disputes for Payment #{Number(searchPaymentId)}</Heading>
          {paymentDisputeIds.length === 0 ? (
            <Card><CardContent className="p-6 text-center"><p className="text-sm text-gray-500">No disputes found for this payment</p></CardContent></Card>
          ) : (
            paymentDisputeIds.map((id) => <DisputeCard key={id.toString()} disputeId={id} />)
          )}
        </div>
      )}

      {searchDisputer && (
        <div className="space-y-4">
          <Heading as="h3">Disputes by {searchDisputer.slice(0, 8)}...</Heading>
          {disputerDisputeIds.length === 0 ? (
            <Card><CardContent className="p-6 text-center"><p className="text-sm text-gray-500">No disputes found for this address</p></CardContent></Card>
          ) : (
            disputerDisputeIds.map((id) => <DisputeCard key={id.toString()} disputeId={id} />)
          )}
        </div>
      )}
    </div>
  );
}
