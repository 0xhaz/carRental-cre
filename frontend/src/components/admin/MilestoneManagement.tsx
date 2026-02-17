"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Badge } from "@/components/ui";
import {
  useVehiclePayments,
  usePaymentDetails,
  useCompleteVehicleMilestone,
  useVehicleMilestoneStatus,
  useReleaseAllVehiclePayments,
} from "@/hooks/useInvestment";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";
import { investmentApi, vehicleApi } from "@/lib/api";
import { MilestoneDocument, type PaymentReportEvent, type MilestoneName } from "@/types";
import {
  usePaymentReceiverConfig,
  usePaymentReceiverProtocol,
  useWatchPaymentReports,
} from "@/hooks/useCRE";

const MILESTONE_NAMES = [
  "Vehicle Identified",
  "Purchase Verified",
  "Insurance Obtained",
  "Registration Completed",
];

/** Maps display name → on-chain milestone string */
const MILESTONE_CRE_KEYS: Record<string, MilestoneName> = {
  "Vehicle Identified": "VEHICLE_IDENTIFIED",
  "Purchase Verified": "PURCHASE_VERIFIED",
  "Insurance Obtained": "INSURANCE_OBTAINED",
  "Registration Completed": "REGISTRATION_COMPLETED",
};

/** Read-only payment row showing investor + amount + status */
function PaymentRow({ paymentId }: { paymentId: bigint }) {
  const { data: paymentData } = usePaymentDetails(paymentId);

  const payment = paymentData as {
    paymentId: bigint;
    payer: string;
    amount: bigint;
    state: number;
  } | undefined;

  const amount = payment?.amount ? formatEther(payment.amount) : "—";
  const investor = payment?.payer;
  // PaymentState: 0=PENDING, 1=CONFIRMED, 2=CANCELLED, 3=REFUNDED
  const stateLabel = payment?.state === 1 ? "Released" : payment?.state === 0 ? "Pending" : "Other";

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-gray-500">#{paymentId.toString()}</span>
        {investor && (
          <span className="text-xs font-mono text-gray-600">
            {investor.slice(0, 8)}...{investor.slice(-6)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{amount} ETH</span>
        <Badge variant={payment?.state === 1 ? "success" : payment?.state === 0 ? "warning" : "default"}>
          {stateLabel}
        </Badge>
      </div>
    </div>
  );
}

interface MilestoneManagementProps {
  vehicleId: bigint;
  vehicleDbId?: string;
}

export default function MilestoneManagement({ vehicleId, vehicleDbId }: MilestoneManagementProps) {
  const { data: paymentIds } = useVehiclePayments(vehicleId);
  const payments = paymentIds as bigint[] | undefined;
  const { data: milestoneData, refetch: refetchMilestones } = useVehicleMilestoneStatus(vehicleId);

  const {
    completeVehicleMilestone,
    hash: completeHash,
    isConfirming: isCompleteConfirming,
    isSuccess: completeSuccess,
    isPending: isCompletePending,
    error: completeError,
  } = useCompleteVehicleMilestone();

  const {
    releaseAll,
    hash: releaseHash,
    isConfirming: isReleaseConfirming,
    isSuccess: releaseSuccess,
    isPending: isReleasePending,
    error: releaseError,
  } = useReleaseAllVehiclePayments();

  const [completingMilestone, setCompletingMilestone] = useState<number | null>(null);
  const [milestoneDocuments, setMilestoneDocuments] = useState<MilestoneDocument[]>([]);

  // CRE PaymentReceiver status
  const creConfig = usePaymentReceiverConfig();
  const { data: creProtocol } = usePaymentReceiverProtocol();
  const [creVerifiedMilestones, setCreVerifiedMilestones] = useState<Record<string, PaymentReportEvent>>({});

  // Watch for live CRE PaymentReportProcessed events
  useWatchPaymentReports((event) => {
    setCreVerifiedMilestones((prev) => ({
      ...prev,
      [event.milestone]: event,
    }));
    toast.success(`CRE verified milestone: ${event.milestone}`);
    refetchMilestones();
  });

  // Load milestone documents from backend
  useEffect(() => {
    if (!vehicleDbId) return;
    vehicleApi.getMilestoneDocuments(vehicleDbId)
      .then((res) => { if (res.success) setMilestoneDocuments(res.data); })
      .catch(() => {});
  }, [vehicleDbId]);

  const getDocForMilestone = (name: string) =>
    milestoneDocuments.find((doc) => doc.milestoneName === name);

  // Parse vehicle-level milestone status
  const milestoneStruct = milestoneData as {
    vehicleIdentified: boolean;
    purchaseVerified: boolean;
    insuranceObtained: boolean;
    registrationCompleted: boolean;
    allFundsReleased: boolean;
    completedAt: bigint;
  } | undefined;

  const milestones = milestoneStruct
    ? [
        milestoneStruct.vehicleIdentified,
        milestoneStruct.purchaseVerified,
        milestoneStruct.insuranceObtained,
        milestoneStruct.registrationCompleted,
      ]
    : undefined;

  const allComplete = milestones?.every((m) => m) ?? false;
  const allFundsReleased = milestoneStruct?.allFundsReleased ?? false;

  useEffect(() => {
    if (completeSuccess && completeHash) {
      toast.success("Vehicle milestone completed!");
      // Sync to DB
      const milestoneName = completingMilestone !== null ? MILESTONE_NAMES[completingMilestone] : "Unknown";
      investmentApi.recordMilestoneCompleted(vehicleId.toString(), {
        milestoneName,
        txHash: completeHash,
      }).catch((err) => console.error("Failed to sync milestone to DB:", err));
      setCompletingMilestone(null);
      refetchMilestones();
    }
  }, [completeSuccess, completeHash]);

  useEffect(() => {
    if (releaseSuccess && releaseHash) {
      toast.success("All funds released and tokens minted!");
      // Sync to DB
      investmentApi.recordFundsReleased(vehicleId.toString(), {
        txHash: releaseHash,
      }).catch((err) => console.error("Failed to sync funds release to DB:", err));
      refetchMilestones();
    }
  }, [releaseSuccess, releaseHash]);

  useEffect(() => {
    if (completeError) {
      toast.error(completeError.message?.slice(0, 100) || "Failed to complete milestone");
      setCompletingMilestone(null);
    }
  }, [completeError]);

  useEffect(() => {
    if (releaseError) {
      toast.error(releaseError.message?.slice(0, 100) || "Failed to release funds");
    }
  }, [releaseError]);

  return (
    <Card>
      <CardContent className="p-6">
        <Heading as="h3" className="mb-4">
          Milestone Management — Vehicle #{vehicleId.toString()}
        </Heading>

        {!payments || payments.length === 0 ? (
          <p className="text-sm text-gray-500">No investments found for this vehicle.</p>
        ) : (
          <div className="space-y-6">
            {/* Vehicle-Level Milestones */}
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-3">Vehicle Milestones</p>
              <p className="text-xs text-gray-500 mb-4">
                Complete milestones for the vehicle. When all 4 are done, funds are released and tokens minted for all {payments.length} investor{payments.length !== 1 ? "s" : ""} automatically.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MILESTONE_NAMES.map((name, i) => {
                  const isCompleted = milestones?.[i] ?? false;
                  const isProcessing = completingMilestone === i && (isCompletePending || isCompleteConfirming);
                  const doc = getDocForMilestone(name);
                  const creKey = MILESTONE_CRE_KEYS[name];
                  const creEvent = creKey ? creVerifiedMilestones[creKey] : undefined;

                  return (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-gray-100">
                      <div className="mt-0.5">
                        {isCompleted ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setCompletingMilestone(i);
                              completeVehicleMilestone(vehicleId, i);
                            }}
                            disabled={isProcessing || isCompletePending || isCompleteConfirming || allFundsReleased}
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                            title={`Complete: ${name}`}
                          >
                            {isProcessing && <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />}
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isCompleted ? "text-green-700 font-medium" : "text-gray-600"}`}>
                            {name}
                          </span>
                          {creEvent ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700" title={`CRE verified - tx: ${creEvent.transactionHash}`}>
                              <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              CRE
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                              Manual
                            </span>
                          ) : null}
                        </div>
                        {doc ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}${doc.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-0.5"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {doc.originalName}
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">No document uploaded</p>
                        )}
                        {creEvent && (
                          <a
                            href={getEtherscanUrl(SEPOLIA_CHAIN_ID, creEvent.transactionHash, "tx")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-400 hover:underline mt-0.5 block"
                          >
                            CRE tx: {creEvent.transactionHash.slice(0, 14)}...
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {completeHash && (
                <a
                  href={getEtherscanUrl(SEPOLIA_CHAIN_ID, completeHash, "tx")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-3 block"
                >
                  Milestone tx: {completeHash.slice(0, 14)}...
                </a>
              )}

              {allComplete && !allFundsReleased && (
                <Button
                  onClick={() => releaseAll(vehicleId)}
                  disabled={isReleasePending || isReleaseConfirming}
                  className="w-full mt-4"
                >
                  {isReleasePending
                    ? "Confirm in Wallet..."
                    : isReleaseConfirming
                    ? "Releasing All Funds..."
                    : `Release Funds & Mint Tokens (${payments.length} payment${payments.length !== 1 ? "s" : ""})`}
                </Button>
              )}

              {allFundsReleased && (
                <div className="mt-3">
                  <Badge variant="success">All Funds Released & Tokens Minted</Badge>
                </div>
              )}

              {releaseHash && (
                <a
                  href={getEtherscanUrl(SEPOLIA_CHAIN_ID, releaseHash, "tx")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-2 block"
                >
                  Release tx: {releaseHash.slice(0, 14)}...
                </a>
              )}
            </div>

            {/* CRE PaymentReceiver Status */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium">Chainlink CRE Status</p>
              </div>
              {creConfig.isLoading ? (
                <p className="text-xs text-gray-400">Loading CRE configuration...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Forwarder:</span>{" "}
                    {creConfig.forwarderAddress ? (
                      <a
                        href={getEtherscanUrl(SEPOLIA_CHAIN_ID, creConfig.forwarderAddress, "address")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-500 hover:underline"
                      >
                        {creConfig.forwarderAddress.slice(0, 10)}...
                      </a>
                    ) : (
                      <span className="text-red-500">Not set</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Target Protocol:</span>{" "}
                    {creProtocol ? (
                      <a
                        href={getEtherscanUrl(SEPOLIA_CHAIN_ID, creProtocol as string, "address")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-500 hover:underline"
                      >
                        {(creProtocol as string).slice(0, 10)}...
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Workflow Author:</span>{" "}
                    <span className="font-mono">
                      {creConfig.expectedAuthor && creConfig.expectedAuthor !== "0x0000000000000000000000000000000000000000"
                        ? `${creConfig.expectedAuthor.slice(0, 10)}...`
                        : "Any"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">CRE Verified:</span>{" "}
                    <span className="font-medium">
                      {Object.keys(creVerifiedMilestones).length}/4 milestones
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment List */}
            <div>
              <p className="text-sm font-medium mb-2">
                Investments ({payments.length})
              </p>
              <div className="border rounded-lg divide-y">
                {payments.map((pid) => (
                  <PaymentRow key={pid.toString()} paymentId={pid} />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
