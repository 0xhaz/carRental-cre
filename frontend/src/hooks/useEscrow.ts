/**
 * PaymentEscrow Hooks
 * Read hooks for querying escrow status from both investment and rental
 * PaymentEscrow contracts.
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { usePaymentEscrow, useRentalEscrow } from "./useContracts";
import { formatEther, parseGwei } from "viem";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

// Display labels for EscrowState enum
export const ESCROW_STATE_LABELS: Record<number, string> = {
  0: "Active",
  1: "Released",
  2: "Refunded",
  3: "Expired",
};

/*//////////////////////////////////////////////////////////////
                    INVESTMENT ESCROW HOOKS
//////////////////////////////////////////////////////////////*/

/**
 * Get escrow details by escrow ID
 */
export function useEscrowDetails(escrowId?: bigint) {
  const { address, abi } = usePaymentEscrow();

  return useReadContract({
    address,
    abi,
    functionName: "getEscrowDetails",
    args: escrowId !== undefined ? [escrowId] : undefined,
    query: {
      enabled: escrowId !== undefined,
    },
  });
}

/**
 * Get the escrow ID associated with a payment
 */
export function useEscrowByPayment(paymentId?: bigint) {
  const { address, abi } = usePaymentEscrow();

  return useReadContract({
    address,
    abi,
    functionName: "getEscrowByPayment",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: {
      enabled: paymentId !== undefined,
    },
  });
}

/**
 * Check if an escrow has expired
 */
export function useIsEscrowExpired(escrowId?: bigint) {
  const { address, abi } = usePaymentEscrow();

  return useReadContract({
    address,
    abi,
    functionName: "isEscrowExpired",
    args: escrowId !== undefined ? [escrowId] : undefined,
    query: {
      enabled: escrowId !== undefined,
    },
  });
}

/**
 * Get the current balance held in an escrow
 */
export function useEscrowBalance(escrowId?: bigint) {
  const { address, abi } = usePaymentEscrow();

  const result = useReadContract({
    address,
    abi,
    functionName: "getEscrowBalance",
    args: escrowId !== undefined ? [escrowId] : undefined,
    query: {
      enabled: escrowId !== undefined,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/*//////////////////////////////////////////////////////////////
                    RENTAL ESCROW HOOKS
//////////////////////////////////////////////////////////////*/

export function useRentalEscrowDetails(escrowId?: bigint) {
  const { address, abi } = useRentalEscrow();

  return useReadContract({
    address,
    abi,
    functionName: "getEscrowDetails",
    args: escrowId !== undefined ? [escrowId] : undefined,
    query: { enabled: escrowId !== undefined },
  });
}

export function useRentalEscrowByPayment(paymentId?: bigint) {
  const { address, abi } = useRentalEscrow();

  return useReadContract({
    address,
    abi,
    functionName: "getEscrowByPayment",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: { enabled: paymentId !== undefined },
  });
}

export function useIsRentalEscrowExpired(escrowId?: bigint) {
  const { address, abi } = useRentalEscrow();

  return useReadContract({
    address,
    abi,
    functionName: "isEscrowExpired",
    args: escrowId !== undefined ? [escrowId] : undefined,
    query: { enabled: escrowId !== undefined },
  });
}

export function useRentalEscrowBalance(escrowId?: bigint) {
  const { address, abi } = useRentalEscrow();

  const result = useReadContract({
    address,
    abi,
    functionName: "getEscrowBalance",
    args: escrowId !== undefined ? [escrowId] : undefined,
    query: { enabled: escrowId !== undefined },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/*//////////////////////////////////////////////////////////////
                    ESCROW ADMIN HOOKS
//////////////////////////////////////////////////////////////*/

/**
 * Get available fees accumulated in the escrow contract
 */
export function useAvailableEscrowFees() {
  const { address, abi } = usePaymentEscrow();

  const result = useReadContract({
    address,
    abi,
    functionName: "getAvailableFees",
    query: { enabled: true },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Get available fees from rental escrow
 */
export function useAvailableRentalEscrowFees() {
  const { address, abi } = useRentalEscrow();

  const result = useReadContract({
    address,
    abi,
    functionName: "getAvailableFees",
    query: { enabled: true },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Process a single expired escrow (public)
 */
export function useProcessExpiredEscrow() {
  const { address, abi } = usePaymentEscrow();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const processExpired = (escrowId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "processExpiredEscrow",
      args: [escrowId],
      gas: BigInt(300_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { processExpired, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Batch process multiple expired escrows (public)
 */
export function useBatchProcessExpiredEscrows() {
  const { address, abi } = usePaymentEscrow();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const batchProcess = (escrowIds: bigint[]) => {
    writeContract({
      address,
      abi,
      functionName: "batchProcessExpiredEscrows",
      args: [escrowIds],
      gas: BigInt(1_000_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { batchProcess, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Withdraw accumulated escrow fees (owner only)
 */
export function useWithdrawEscrowFees() {
  const { address, abi } = usePaymentEscrow();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const withdrawFees = (recipient: `0x${string}`, amount: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "withdrawFees",
      args: [recipient, amount],
      gas: BigInt(300_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { withdrawFees, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Emergency refund an escrow (emergency authority only)
 */
export function useEmergencyRefundEscrow() {
  const { address, abi } = usePaymentEscrow();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const emergencyRefund = (escrowId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "emergencyRefund",
      args: [escrowId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { emergencyRefund, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Process expired rental escrow (public)
 */
export function useProcessExpiredRentalEscrow() {
  const { address, abi } = useRentalEscrow();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const processExpired = (escrowId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "processExpiredEscrow",
      args: [escrowId],
      gas: BigInt(300_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { processExpired, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Batch process expired rental escrows (public)
 */
export function useBatchProcessExpiredRentalEscrows() {
  const { address, abi } = useRentalEscrow();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const batchProcess = (escrowIds: bigint[]) => {
    writeContract({
      address,
      abi,
      functionName: "batchProcessExpiredEscrows",
      args: [escrowIds],
      gas: BigInt(1_000_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { batchProcess, hash, isConfirming, isSuccess, isPending, error };
}
