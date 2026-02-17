"use client";

import { useState } from "react";
import { Card, CardContent, Heading, Badge, Button, Input } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useBookingDamageAssessments,
  useApproveDamageAssessment,
} from "@/hooks/useRentalOperations";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";

export interface DamageAssessmentCardProps {
  bookingId: bigint;
  isAdmin?: boolean;
  className?: string;
}

interface DamageAssessment {
  timestamp: bigint;
  bookingId: bigint;
  damages: string[];
  costs: bigint[];
  totalCost: bigint;
  evidenceHashes: string[];
  assessor: string;
  approved: boolean;
}

export function DamageAssessmentCard({
  bookingId,
  isAdmin = false,
  className,
}: DamageAssessmentCardProps) {
  const { data: assessments, isLoading } = useBookingDamageAssessments(bookingId);
  const [approvalCost, setApprovalCost] = useState("");

  const {
    approveDamageAssessment,
    hash,
    isConfirming,
    isSuccess,
    isPending,
    error,
  } = useApproveDamageAssessment();

  const items = (assessments as DamageAssessment[]) || [];

  const handleApprove = (assessmentId: number, defaultCost: bigint) => {
    const cost = approvalCost ? BigInt(approvalCost) : defaultCost;
    approveDamageAssessment(bookingId, BigInt(assessmentId), cost);
  };

  if (isSuccess) {
    toast.success("Damage assessment approved");
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <Heading as="h3" className="mb-4">
          Damage Assessments
        </Heading>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No damage assessments for this booking
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((assessment, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">
                    Assessment #{idx + 1}
                  </span>
                  <Badge variant={assessment.approved ? "success" : "warning"}>
                    {assessment.approved ? "Approved" : "Pending"}
                  </Badge>
                </div>

                {/* Damages & Costs */}
                <div className="space-y-1 mb-3">
                  {assessment.damages.map((damage, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700">{damage}</span>
                      <span className="font-mono text-gray-900">
                        {formatEther(assessment.costs[i] || BigInt(0))} ETH
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm font-semibold border-t border-gray-200 pt-2 mb-2">
                  <span>Total</span>
                  <span>{formatEther(assessment.totalCost)} ETH</span>
                </div>

                {/* Evidence */}
                {assessment.evidenceHashes.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500">Evidence:</span>
                    <div className="space-y-0.5 mt-0.5">
                      {assessment.evidenceHashes.map((h, i) => (
                        <div key={i} className="text-xs font-mono text-gray-500 truncate">
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mb-2">
                  Assessor:{" "}
                  <ExplorerLink value={assessment.assessor} type="address" />
                </div>

                {/* Admin Approve */}
                {isAdmin && !assessment.approved && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Final cost (wei, optional)"
                        value={approvalCost}
                        onChange={(e) => setApprovalCost(e.target.value)}
                        className="flex-1 text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleApprove(idx, assessment.totalCost)}
                        disabled={isPending || isConfirming}
                      >
                        {isPending
                          ? "Confirm..."
                          : isConfirming
                            ? "Confirming..."
                            : "Approve"}
                      </Button>
                    </div>
                    {error && (
                      <p className="text-xs text-red-600 mt-1">
                        {(error as Error).message?.slice(0, 80)}
                      </p>
                    )}
                    {hash && (
                      <div className="text-xs mt-1">
                        Tx: <ExplorerLink value={hash} type="tx" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
