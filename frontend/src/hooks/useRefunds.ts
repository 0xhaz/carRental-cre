/**
 * RefundManager Hooks
 * Hooks for requesting, tracking, and querying refunds from both
 * investment and rental RefundManager contracts.
 */

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useRefundManager, useRentalRefundManager } from "./useContracts";
import { formatEther, parseGwei } from "viem";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

// Display labels for RefundType enum
export const REFUND_TYPE_LABELS: Record<number, string> = {
  0: "Automatic",
  1: "Manual",
  2: "Dispute",
  3: "Emergency",
};

// Display labels for RefundReason enum
export const REFUND_REASON_LABELS: Record<number, string> = {
  0: "Timeout",
  1: "Compliance Violation",
  2: "Mutual Agreement",
  3: "Dispute Resolution",
  4: "Emergency Action",
  5: "Payment Cancellation",
  6: "System Error",
  7: "Rental Cancellation",
  8: "Booking Conflict",
  9: "Vehicle Unavailable",
  10: "Maintenance Required",
  11: "Weather Emergency",
  12: "Platform Error",
  13: "Milestone Failure",
};

/*//////////////////////////////////////////////////////////////
                    INVESTMENT REFUND HOOKS
//////////////////////////////////////////////////////////////*/

/**
 * Request a refund for an investment payment
 */
export function useRequestRefund() {
  const { address, abi } = useRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const requestRefund = (
    paymentId: bigint,
    refundType: number,
    reason: number,
    description: string,
    evidenceHash: `0x${string}`,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "requestRefund",
      args: [paymentId, refundType, reason, description, evidenceHash],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return { requestRefund, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Get refund request details by ID
 */
export function useRefundRequest(refundId?: bigint) {
  const { address, abi } = useRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "getRefundRequest",
    args: refundId !== undefined ? [refundId] : undefined,
    query: {
      enabled: refundId !== undefined,
    },
  });
}

/**
 * Get all refund IDs for a payment
 */
export function useRefundsByPayment(paymentId?: bigint) {
  const { address, abi } = useRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "getRefundsByPayment",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: {
      enabled: paymentId !== undefined,
    },
  });
}

/**
 * Get all refund IDs by requester address
 */
export function useRefundsByRequester(requester?: `0x${string}`) {
  const { address, abi } = useRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "getRefundsByRequester",
    args: requester ? [requester] : undefined,
    query: {
      enabled: !!requester,
    },
  });
}

/**
 * Check if a requester can request a refund for a payment
 */
export function useCanRequestRefund(
  paymentId?: bigint,
  requester?: `0x${string}`,
) {
  const { address, abi } = useRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "canRequestRefund",
    args:
      paymentId !== undefined && requester
        ? [paymentId, requester]
        : undefined,
    query: {
      enabled: paymentId !== undefined && !!requester,
    },
  });
}

/**
 * Check if a payment is eligible for a specific refund type
 */
export function useIsRefundEligible(
  paymentId?: bigint,
  refundType?: number,
) {
  const { address, abi } = useRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "isRefundEligible",
    args:
      paymentId !== undefined && refundType !== undefined
        ? [paymentId, refundType]
        : undefined,
    query: {
      enabled: paymentId !== undefined && refundType !== undefined,
    },
  });
}

/**
 * Get the refund amount for a payment
 */
export function useRefundAmount(paymentId?: bigint) {
  const { address, abi } = useRefundManager();

  const result = useReadContract({
    address,
    abi,
    functionName: "getRefundAmount",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: {
      enabled: paymentId !== undefined,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/*//////////////////////////////////////////////////////////////
                    RENTAL REFUND HOOKS
//////////////////////////////////////////////////////////////*/

/**
 * Request a refund for a rental payment
 */
export function useRequestRentalRefund() {
  const { address, abi } = useRentalRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const requestRentalRefund = (
    paymentId: bigint,
    refundType: number,
    reason: number,
    description: string,
    evidenceHash: `0x${string}`,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "requestRefund",
      args: [paymentId, refundType, reason, description, evidenceHash],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return {
    requestRentalRefund,
    hash,
    isConfirming,
    isSuccess,
    isPending,
    error,
  };
}

export function useRentalRefundRequest(refundId?: bigint) {
  const { address, abi } = useRentalRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "getRefundRequest",
    args: refundId !== undefined ? [refundId] : undefined,
    query: { enabled: refundId !== undefined },
  });
}

export function useRentalRefundsByPayment(paymentId?: bigint) {
  const { address, abi } = useRentalRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "getRefundsByPayment",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: { enabled: paymentId !== undefined },
  });
}

export function useRentalRefundsByRequester(requester?: `0x${string}`) {
  const { address, abi } = useRentalRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "getRefundsByRequester",
    args: requester ? [requester] : undefined,
    query: { enabled: !!requester },
  });
}

export function useCanRequestRentalRefund(
  paymentId?: bigint,
  requester?: `0x${string}`,
) {
  const { address, abi } = useRentalRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "canRequestRefund",
    args:
      paymentId !== undefined && requester
        ? [paymentId, requester]
        : undefined,
    query: { enabled: paymentId !== undefined && !!requester },
  });
}

export function useIsRentalRefundEligible(
  paymentId?: bigint,
  refundType?: number,
) {
  const { address, abi } = useRentalRefundManager();

  return useReadContract({
    address,
    abi,
    functionName: "isRefundEligible",
    args:
      paymentId !== undefined && refundType !== undefined
        ? [paymentId, refundType]
        : undefined,
    query: {
      enabled: paymentId !== undefined && refundType !== undefined,
    },
  });
}

export function useRentalRefundAmount(paymentId?: bigint) {
  const { address, abi } = useRentalRefundManager();

  const result = useReadContract({
    address,
    abi,
    functionName: "getRefundAmount",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: { enabled: paymentId !== undefined },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/*//////////////////////////////////////////////////////////////
                    CONVENIENCE WRAPPERS
//////////////////////////////////////////////////////////////*/

/** Get current user's investment refund history */
export function useMyRefunds() {
  const { address: userAddress } = useAccount();
  return useRefundsByRequester(userAddress);
}

/** Check if current user can request a refund for a payment */
export function useMyCanRequestRefund(paymentId?: bigint) {
  const { address: userAddress } = useAccount();
  return useCanRequestRefund(paymentId, userAddress);
}

/*//////////////////////////////////////////////////////////////
                    ADMIN REFUND HOOKS
//////////////////////////////////////////////////////////////*/

/**
 * Approve a refund request (authorized processor only)
 */
export function useApproveRefund() {
  const { address, abi } = useRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const approveRefund = (refundId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "approveRefund",
      args: [refundId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return { approveRefund, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Reject a refund request (authorized processor only)
 */
export function useRejectRefund() {
  const { address, abi } = useRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const rejectRefund = (refundId: bigint, reason: string) => {
    writeContract({
      address,
      abi,
      functionName: "rejectRefund",
      args: [refundId, reason],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return { rejectRefund, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Process an approved refund (public, but conditions must be met)
 */
export function useProcessRefund() {
  const { address, abi } = useRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const processRefund = (refundId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "processRefund",
      args: [refundId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return { processRefund, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Emergency refund (emergency authority only)
 */
export function useEmergencyRefund() {
  const { address, abi } = useRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const emergencyRefund = (
    paymentId: bigint,
    recipient: `0x${string}`,
    reason: number,
    description: string,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "emergencyRefund",
      args: [paymentId, recipient, reason, description],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return { emergencyRefund, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Approve a rental refund request (authorized processor only)
 */
export function useApproveRentalRefund() {
  const { address, abi } = useRentalRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const approveRefund = (refundId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "approveRefund",
      args: [refundId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return { approveRefund, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Reject a rental refund request (authorized processor only)
 */
export function useRejectRentalRefund() {
  const { address, abi } = useRentalRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const rejectRefund = (refundId: bigint, reason: string) => {
    writeContract({
      address,
      abi,
      functionName: "rejectRefund",
      args: [refundId, reason],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return { rejectRefund, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Process an approved rental refund
 */
export function useProcessRentalRefund() {
  const { address, abi } = useRentalRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const processRefund = (refundId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "processRefund",
      args: [refundId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return { processRefund, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Emergency rental refund (emergency authority only)
 */
export function useEmergencyRentalRefund() {
  const { address, abi } = useRentalRefundManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const emergencyRefund = (
    paymentId: bigint,
    recipient: `0x${string}`,
    reason: number,
    description: string,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "emergencyRefund",
      args: [paymentId, recipient, reason, description],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  return { emergencyRefund, hash, isConfirming, isSuccess, isPending, error };
}
