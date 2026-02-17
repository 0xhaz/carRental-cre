/**
 * Dispute Hooks
 * Hooks for interacting with the DisputeResolver contract.
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useDisputeResolver } from "./useContracts";

// ═══════════════════════════════════════════════
// Read Hooks
// ═══════════════════════════════════════════════

/**
 * Get dispute details by ID
 */
export function useDisputeDetails(disputeId?: bigint) {
  const { address, abi } = useDisputeResolver();

  return useReadContract({
    address,
    abi,
    functionName: "getDispute",
    args: disputeId !== undefined ? [disputeId] : undefined,
    query: {
      enabled: disputeId !== undefined,
    },
  });
}

/**
 * Get all dispute IDs for a payment
 */
export function useDisputesByPayment(paymentId?: bigint) {
  const { address, abi } = useDisputeResolver();

  return useReadContract({
    address,
    abi,
    functionName: "getDisputesByPayment",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: {
      enabled: paymentId !== undefined,
    },
  });
}

/**
 * Get all dispute IDs filed by a specific address
 */
export function useDisputesByDisputer(disputerAddress?: string) {
  const { address, abi } = useDisputeResolver();

  return useReadContract({
    address,
    abi,
    functionName: "getDisputesByDisputer",
    args: disputerAddress ? [disputerAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!disputerAddress,
    },
  });
}

/**
 * Get vote counts for a dispute
 */
export function useDisputeVoteCounts(disputeId?: bigint) {
  const { address, abi } = useDisputeResolver();

  return useReadContract({
    address,
    abi,
    functionName: "getVoteCounts",
    args: disputeId !== undefined ? [disputeId] : undefined,
    query: {
      enabled: disputeId !== undefined,
    },
  });
}

/**
 * Check if a dispute has expired
 */
export function useIsDisputeExpired(disputeId?: bigint) {
  const { address, abi } = useDisputeResolver();

  return useReadContract({
    address,
    abi,
    functionName: "isDisputeExpired",
    args: disputeId !== undefined ? [disputeId] : undefined,
    query: {
      enabled: disputeId !== undefined,
    },
  });
}

// ═══════════════════════════════════════════════
// Write Hooks (Admin)
// ═══════════════════════════════════════════════

/**
 * Emergency resolve a dispute (owner only)
 */
export function useEmergencyResolveDispute() {
  const { address, abi } = useDisputeResolver();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const emergencyResolve = (
    disputeId: bigint,
    outcome: number,
    refundAmount: bigint,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "emergencyResolve",
      args: [disputeId, outcome, refundAmount],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { emergencyResolve, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Close a resolved dispute (owner only)
 */
export function useCloseDispute() {
  const { address, abi } = useDisputeResolver();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const closeDispute = (disputeId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "closeDispute",
      args: [disputeId],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { closeDispute, hash, isConfirming, isSuccess, isPending, error };
}

// Dispute state display names
export const DISPUTE_STATE_LABELS: Record<number, string> = {
  0: "Filed",
  1: "Under Review",
  2: "Resolved",
  3: "Appealed",
  4: "Closed",
};

export const DISPUTE_STATE_VARIANTS: Record<number, "warning" | "info" | "success" | "error"> = {
  0: "warning",
  1: "info",
  2: "success",
  3: "error",
  4: "info",
};

export const DISPUTE_OUTCOME_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Favor Payer",
  2: "Favor Payee",
  3: "Partial Refund",
  4: "Escalated",
};
