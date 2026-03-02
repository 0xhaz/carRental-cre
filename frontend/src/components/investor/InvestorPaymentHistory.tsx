"use client";

import { useState } from "react";
import { Card, CardContent, Heading, Badge, Button } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useMyPaymentsAsPayer,
  useMyPaymentsAsPayee,
  usePaymentDetails,
  usePaymentState,
  useIsPaymentExpired,
  useCanDispute,
  useMilestoneStatus,
  PAYMENT_STATE_LABELS,
} from "@/hooks/useInvestment";
import {
  useEscrowByPayment,
  useEscrowDetails,
  useEscrowBalance,
  ESCROW_STATE_LABELS,
} from "@/hooks/useEscrow";
import { formatEther } from "viem";

function PaymentRow({ paymentId }: { paymentId: bigint }) {
  const [expanded, setExpanded] = useState(false);
  const { data: payment } = usePaymentDetails(paymentId);
  const { data: state } = usePaymentState(paymentId);
  const { data: isExpired } = useIsPaymentExpired(paymentId);
  const { data: canDispute } = useCanDispute(paymentId);
  const { data: milestone } = useMilestoneStatus(paymentId);

  // Escrow
  const { data: escrowId } = useEscrowByPayment(paymentId);
  const { data: escrow } = useEscrowDetails(escrowId as bigint | undefined);
  const { formatted: escrowBalance } = useEscrowBalance(escrowId as bigint | undefined);

  const stateNum = state !== undefined ? Number(state) : undefined;
  const p = payment as any;
  const escrowState = escrow ? Number((escrow as any)[3] ?? 0) : undefined;

  return (
    <Card>
      <CardContent className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold">Payment #{Number(paymentId)}</p>
            {stateNum !== undefined && (
              <Badge variant={stateNum === 3 ? "success" : stateNum === 7 ? "error" : stateNum === 5 ? "warning" : "info"}>
                {PAYMENT_STATE_LABELS[stateNum] || `State ${stateNum}`}
              </Badge>
            )}
            {Boolean(isExpired) && <Badge variant="error">Expired</Badge>}
            {Boolean(canDispute) && <Badge variant="warning">Disputable</Badge>}
          </div>
          <div className="flex items-center gap-3">
            {p && <p className="text-sm font-mono text-gray-600">{p[4] ? formatEther(p[4] as bigint) : "—"} ETH</p>}
            <span className="text-gray-400 text-sm">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3">
            {p && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Payer</span>
                  <ExplorerLink value={p[1] || ""} type="address" className="text-xs" />
                </div>
                <div>
                  <span className="text-gray-500">Payee</span>
                  <ExplorerLink value={p[2] || ""} type="address" className="text-xs" />
                </div>
                <div>
                  <span className="text-gray-500">Vehicle ID</span>
                  <p className="font-mono">#{p[3] ? Number(p[3]) : "—"}</p>
                </div>
              </div>
            )}

            {/* Milestone Progress */}
            {milestone && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-blue-800 mb-2">Milestones</p>
                <div className="flex gap-2">
                  {(milestone as boolean[]).map((complete, i) => (
                    <div key={i} className={`flex-1 h-2 rounded ${complete ? "bg-blue-500" : "bg-gray-200"}`} />
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {(milestone as boolean[]).filter(Boolean).length} / {(milestone as boolean[]).length} completed
                </p>
              </div>
            )}

            {/* Escrow */}
            {escrowId !== undefined && (
              <div className="bg-gray-50 p-3 rounded-lg text-xs">
                <p className="font-medium mb-1">Escrow #{Number(escrowId)}</p>
                <div className="flex gap-4">
                  <span>Balance: {escrowBalance} ETH</span>
                  {escrowState !== undefined && (
                    <Badge variant="info" className="text-xs">{ESCROW_STATE_LABELS[escrowState]}</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvestorPaymentHistory() {
  const [tab, setTab] = useState<"payer" | "payee">("payer");
  const { data: payerPayments } = useMyPaymentsAsPayer();
  const { data: payeePayments } = useMyPaymentsAsPayee();

  const payerIds = (payerPayments as bigint[]) || [];
  const payeeIds = (payeePayments as bigint[]) || [];
  const activeIds = tab === "payer" ? payerIds : payeeIds;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Heading as="h3">Payment History</Heading>
            <div className="flex gap-2">
              <Button variant={tab === "payer" ? "default" : "outline"} size="sm" onClick={() => setTab("payer")}>
                Payments Made ({payerIds.length})
              </Button>
              <Button variant={tab === "payee" ? "default" : "outline"} size="sm" onClick={() => setTab("payee")}>
                Payments Received ({payeeIds.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeIds.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-gray-500">No {tab === "payer" ? "outgoing" : "incoming"} payments found on-chain</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeIds.map((id) => (
            <PaymentRow key={id.toString()} paymentId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
