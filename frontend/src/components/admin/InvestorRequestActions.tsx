"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Input, Badge } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useInvestorRequest,
  useHasActiveRequest,
  useApproveInvestorRequest,
  useRejectInvestorRequest,
  useCreateMultiSigWallet,
  useCreateMultiSigWalletForUpgrade,
} from "@/hooks/useInvestment";
import { toast } from "react-hot-toast";

const REQUEST_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Approved",
  2: "Rejected",
  3: "Completed",
};

export default function InvestorRequestActions() {
  const [lookupAddress, setLookupAddress] = useState("");
  const [searchAddress, setSearchAddress] = useState<`0x${string}` | undefined>();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  // Multisig wallet creation
  const [msOwners, setMsOwners] = useState("");
  const [msRequired, setMsRequired] = useState("2");

  const { data: requestData } = useInvestorRequest(searchAddress);
  const { data: hasActive } = useHasActiveRequest(searchAddress);

  const approve = useApproveInvestorRequest();
  const reject = useRejectInvestorRequest();
  const createWallet = useCreateMultiSigWallet();
  const createWalletUpgrade = useCreateMultiSigWalletForUpgrade();

  useEffect(() => {
    if (approve.isSuccess) toast.success("Investor request approved!");
  }, [approve.isSuccess]);

  useEffect(() => {
    if (reject.isSuccess) { toast.success("Investor request rejected"); setShowReject(false); }
  }, [reject.isSuccess]);

  useEffect(() => {
    if (createWallet.isSuccess) toast.success("MultiSig wallet created!");
  }, [createWallet.isSuccess]);

  useEffect(() => {
    if (createWalletUpgrade.isSuccess) toast.success("Upgrade MultiSig wallet created!");
  }, [createWalletUpgrade.isSuccess]);

  const request = requestData as any;
  const statusNum = request ? Number(request[3] ?? request.status ?? 0) : undefined;

  return (
    <div className="space-y-6">
      {/* Lookup */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-3">Investor Request Actions</Heading>
          <div className="flex items-center gap-3">
            <Input
              type="text"
              value={lookupAddress}
              onChange={(e) => setLookupAddress(e.target.value)}
              placeholder="Investor wallet address 0x..."
              className="flex-1"
            />
            <Button
              onClick={() => setSearchAddress(lookupAddress as `0x${string}`)}
              disabled={!lookupAddress.match(/^0x[a-fA-F0-9]{40}$/)}
            >
              Look Up
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Request Details */}
      {searchAddress && request && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading as="h4" className="text-sm">Request for {searchAddress.slice(0, 8)}...</Heading>
              <div className="flex gap-2">
                {Boolean(hasActive) && <Badge variant="info">Active Request</Badge>}
                {statusNum !== undefined && (
                  <Badge variant={statusNum === 1 ? "success" : statusNum === 2 ? "error" : "warning"}>
                    {REQUEST_STATUS_LABELS[statusNum] || `Status ${statusNum}`}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-gray-500">Type</span>
                <p className="font-mono">{Number(request[0] ?? 0)}</p>
              </div>
              <div>
                <span className="text-gray-500">Required Lock</span>
                <p className="font-mono">{request[1]?.toString() || "0"}</p>
              </div>
              <div>
                <span className="text-gray-500">Wallet</span>
                {request[2] && <ExplorerLink value={request[2]} type="address" />}
              </div>
              <div>
                <span className="text-gray-500">Reason</span>
                <p className="text-sm">{request[5] || "—"}</p>
              </div>
            </div>

            {/* Approve / Reject */}
            {statusNum === 0 && (
              <div className="flex gap-3 mb-4">
                <Button
                  onClick={() => approve.approve(searchAddress)}
                  disabled={approve.isPending || approve.isConfirming}
                >
                  {approve.isPending ? "Confirm..." : approve.isConfirming ? "Approving..." : "Approve"}
                </Button>
                <Button variant="outline" onClick={() => setShowReject(!showReject)}>
                  Reject
                </Button>
              </div>
            )}

            {showReject && statusNum === 0 && (
              <div className="p-3 bg-red-50 rounded-lg space-y-2 mb-4">
                <Input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason"
                  className="text-sm"
                />
                <Button
                  onClick={() => reject.reject(searchAddress, rejectReason)}
                  disabled={reject.isPending || reject.isConfirming || !rejectReason}
                  className="w-full"
                >
                  {reject.isPending ? "Confirm..." : reject.isConfirming ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            )}

            {[approve, reject].map((h, i) =>
              h.hash ? <ExplorerLink key={i} value={h.hash} type="tx" label="View tx" className="text-xs mb-2 block" /> : null
            )}
          </CardContent>
        </Card>
      )}

      {/* MultiSig Wallet Creation */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-3">Create MultiSig Wallet</Heading>
          <div className="space-y-3">
            <Input
              type="text"
              label="Owners (comma-separated addresses)"
              value={msOwners}
              onChange={(e) => setMsOwners(e.target.value)}
              placeholder="0x..., 0x..., 0x..."
            />
            <Input
              type="number"
              label="Required Signatures"
              value={msRequired}
              onChange={(e) => setMsRequired(e.target.value)}
              placeholder="2"
              min={1}
            />
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  const owners = msOwners.split(",").map(s => s.trim() as `0x${string}`);
                  createWallet.createWallet(searchAddress as `0x${string}`);
                }}
                disabled={createWallet.isPending || createWallet.isConfirming || !msOwners}
                className="flex-1"
              >
                {createWallet.isPending ? "Confirm..." : createWallet.isConfirming ? "Creating..." : "Create Wallet"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const owners = msOwners.split(",").map(s => s.trim() as `0x${string}`);
                  createWalletUpgrade.createWallet(searchAddress as `0x${string}`);
                }}
                disabled={createWalletUpgrade.isPending || createWalletUpgrade.isConfirming || !msOwners}
                className="flex-1"
              >
                {createWalletUpgrade.isPending ? "Confirm..." : "Create for Upgrade"}
              </Button>
            </div>
            {createWallet.hash && <ExplorerLink value={createWallet.hash} type="tx" label="View tx" className="text-xs" />}
            {createWalletUpgrade.hash && <ExplorerLink value={createWalletUpgrade.hash} type="tx" label="View tx" className="text-xs" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
