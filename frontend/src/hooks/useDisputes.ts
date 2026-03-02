/**
 * Dispute Hooks
 * Hooks for interacting with the DisputeResolver contract.
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useDisputeResolver } from "./useContracts";
import { parseGwei } from "viem";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

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

// ═══════════════════════════════════════════════
// Write Hooks (User-Facing)
// ═══════════════════════════════════════════════

/**
 * File a new dispute for a payment
 */
export function useFileDispute() {
  const { address, abi } = useDisputeResolver();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const fileDispute = (
    paymentId: bigint,
    reason: string,
    evidenceHash: `0x${string}`,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "fileDispute",
      args: [paymentId, reason, evidenceHash],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { fileDispute, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Submit an oracle vote on a dispute
 */
export function useSubmitOracleVote() {
  const { address, abi } = useDisputeResolver();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const submitOracleVote = (
    disputeId: bigint,
    favorsPayer: boolean,
    reasoning: string,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "submitOracleVote",
      args: [disputeId, favorsPayer, reasoning],
      gas: BigInt(300_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { submitOracleVote, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Resolve a dispute (after voting period)
 */
export function useResolveDispute() {
  const { address, abi } = useDisputeResolver();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const resolveDispute = (disputeId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "resolveDispute",
      args: [disputeId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { resolveDispute, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Appeal a resolved dispute
 */
export function useAppealDispute() {
  const { address, abi } = useDisputeResolver();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const appealDispute = (disputeId: bigint, reason: string) => {
    writeContract({
      address,
      abi,
      functionName: "appealDispute",
      args: [disputeId, reason],
      gas: BigInt(300_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { appealDispute, hash, isConfirming, isSuccess, isPending, error };
}

// ═══════════════════════════════════════════════
// Additional Read Hooks
// ═══════════════════════════════════════════════

/**
 * Check if an address can file a dispute for a payment
 */
export function useCanFileDispute(paymentId?: bigint, disputer?: `0x${string}`) {
  const { address, abi } = useDisputeResolver();

  return useReadContract({
    address,
    abi,
    functionName: "canFileDispute",
    args: paymentId !== undefined && disputer ? [paymentId, disputer] : undefined,
    query: {
      enabled: paymentId !== undefined && !!disputer,
    },
  });
}

/**
 * Get assigned oracles for a dispute
 */
export function useAssignedOracles(disputeId?: bigint) {
  const { address, abi } = useDisputeResolver();

  return useReadContract({
    address,
    abi,
    functionName: "getAssignedOracles",
    args: disputeId !== undefined ? [disputeId] : undefined,
    query: {
      enabled: disputeId !== undefined,
    },
  });
}

/**
 * Check if an oracle has voted on a dispute
 */
export function useHasOracleVoted(disputeId?: bigint, oracle?: `0x${string}`) {
  const { address, abi } = useDisputeResolver();

  return useReadContract({
    address,
    abi,
    functionName: "hasOracleVoted",
    args: disputeId !== undefined && oracle ? [disputeId, oracle] : undefined,
    query: {
      enabled: disputeId !== undefined && !!oracle,
    },
  });
}

/** Check if current user can file a dispute */
export function useMyCanFileDispute(paymentId?: bigint) {
  const { address: userAddress } = useAccount();
  return useCanFileDispute(paymentId, userAddress);
}

// ═══════════════════════════════════════════════
// Display Constants
// ═══════════════════════════════════════════════

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
