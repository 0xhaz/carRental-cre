/**
 * Investment Hooks
 * Hooks for the investor onboarding flow (InvestorRequestManager)
 * and vehicle investment (RegShieldPaymentProtocol).
 * All payments use native ETH (no ERC-20 tokens).
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  useInvestorRequestManager,
  useRevenueDistributor,
  useRegShieldPaymentProtocol,
  usePaymentEscrow,
} from "./useContracts";
import { parseEther, formatEther } from "viem";

// ═══════════════════════════════════════════════
// Investor Onboarding (InvestorRequestManager)
// ═══════════════════════════════════════════════

/**
 * Get investor request status for a user
 * Returns: (type, requiredLock, wallet, status, createdAt, approvedAt, reason)
 */
export function useInvestorRequest(userAddress?: `0x${string}`) {
  const { address, abi } = useInvestorRequestManager();

  return useReadContract({
    address,
    abi,
    functionName: "getRequest",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}

/**
 * Get my investor request
 */
export function useMyInvestorRequest() {
  const { address: userAddress } = useAccount();
  return useInvestorRequest(userAddress);
}

/**
 * Check if user has an active request
 */
export function useHasActiveRequest(userAddress?: `0x${string}`) {
  const { address, abi } = useInvestorRequestManager();

  return useReadContract({
    address,
    abi,
    functionName: "hasActiveRequest",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}

/**
 * Get direct lock balance for RETAIL investors
 */
export function useDirectLockBalance(userAddress?: `0x${string}`) {
  const { address, abi } = useInvestorRequestManager();

  const result = useReadContract({
    address,
    abi,
    functionName: "directLocks",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Get lock requirement for an investor type
 * InvestorType: RETAIL=1, ACCREDITED=2, INSTITUTIONAL=3
 */
export function useLockRequirement(investorType: number) {
  const { address, abi } = useInvestorRequestManager();

  const result = useReadContract({
    address,
    abi,
    functionName: "lockRequirements",
    args: [investorType],
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Request investor status (Step 1 of onboarding)
 * InvestorType: RETAIL=1, ACCREDITED=2, INSTITUTIONAL=3
 */
export function useRequestInvestorStatus() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const requestStatus = (investorType: number) => {
    writeContract({
      address,
      abi,
      functionName: "requestInvestorStatus",
      args: [investorType],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { requestStatus, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Lock funds directly for RETAIL investors (Step 2)
 * Sends ETH as msg.value
 */
export function useLockFundsDirect() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const lockFunds = (amountEth: string) => {
    writeContract({
      address,
      abi,
      functionName: "lockFundsDirect",
      value: parseEther(amountEth),
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { lockFunds, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Withdraw direct lock (RETAIL - after approval/rejection)
 */
export function useWithdrawDirectLock() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const withdraw = () => {
    writeContract({
      address,
      abi,
      functionName: "withdrawDirectLock",
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { withdraw, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Confirm tokens locked (ACCREDITED/INSTITUTIONAL - Step 4)
 */
export function useConfirmTokensLocked() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const confirmLocked = () => {
    writeContract({
      address,
      abi,
      functionName: "confirmTokensLocked",
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { confirmLocked, hash, isConfirming, isSuccess, ...rest };
}

// ═══════════════════════════════════════════════
// Vehicle Investment (RegShieldPaymentProtocol)
// ═══════════════════════════════════════════════

/**
 * Check if user can invest in a vehicle
 * Returns: (bool canInvest, uint8 reason)
 */
export function useCanInvestInVehicle(vehicleId?: bigint, amount?: bigint) {
  const { address, abi } = useInvestorRequestManager();
  const { address: userAddress } = useAccount();

  return useReadContract({
    address,
    abi,
    functionName: "canInvestInVehicle",
    args: userAddress && vehicleId !== undefined && amount !== undefined
      ? [userAddress, vehicleId, amount]
      : undefined,
    query: {
      enabled: !!userAddress && vehicleId !== undefined && amount !== undefined,
    },
  });
}

/**
 * Get user's investment in a specific vehicle
 */
export function useVehicleInvestment(userAddress?: `0x${string}`, vehicleId?: bigint) {
  const { address, abi } = useInvestorRequestManager();

  const result = useReadContract({
    address,
    abi,
    functionName: "getVehicleInvestment",
    args: userAddress && vehicleId !== undefined ? [userAddress, vehicleId] : undefined,
    query: {
      enabled: !!userAddress && vehicleId !== undefined,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Get user's total investment across all vehicles
 */
export function useTotalInvestment(userAddress?: `0x${string}`) {
  const { address, abi } = useInvestorRequestManager();

  const result = useReadContract({
    address,
    abi,
    functionName: "getTotalInvestment",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Get my total investment
 */
export function useMyTotalInvestment() {
  const { address: userAddress } = useAccount();
  return useTotalInvestment(userAddress);
}

/**
 * Initiate a vehicle investment (sends ETH)
 * msg.value = investment amount + escrow fee
 */
export function useInitiateVehicleInvestment() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const invest = (
    vehicleId: bigint,
    rentor: `0x${string}`,
    amount: bigint,
    reason: string,
    totalValueWithFee: bigint,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "initiateVehicleInvestment",
      args: [vehicleId, rentor, amount, reason],
      value: totalValueWithFee,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { invest, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Get payment details by payment ID
 */
export function usePaymentDetails(paymentId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "getPayment",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: {
      enabled: paymentId !== undefined,
    },
  });
}

/**
 * Get milestone status for a payment
 */
export function useMilestoneStatus(paymentId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "getMilestoneStatus",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: {
      enabled: paymentId !== undefined,
    },
  });
}

/**
 * Get total investment for a vehicle
 */
export function useVehicleInvestmentTotal(vehicleId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();

  const result = useReadContract({
    address,
    abi,
    functionName: "getVehicleInvestmentTotal",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Get all payment IDs for a vehicle
 */
export function useVehiclePayments(vehicleId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "getVehiclePayments",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}

/**
 * Calculate escrow fee for an investment amount
 */
export function useEscrowFee(amount?: bigint) {
  const { address, abi } = usePaymentEscrow();

  const result = useReadContract({
    address,
    abi,
    functionName: "calculateEscrowFee",
    args: amount !== undefined ? [amount] : undefined,
    query: {
      enabled: amount !== undefined,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

// ═══════════════════════════════════════════════
// Revenue Distribution
// ═══════════════════════════════════════════════

/**
 * Get claimable revenue for an investor on a specific vehicle
 */
export function useClaimableRevenue(holderAddress?: `0x${string}`, vehicleId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  const result = useReadContract({
    address,
    abi,
    functionName: "getClaimableRevenue",
    args: vehicleId !== undefined && holderAddress ? [vehicleId, holderAddress] : undefined,
    query: {
      enabled: !!holderAddress && vehicleId !== undefined,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Get my claimable revenue for a vehicle
 */
export function useMyClaimableRevenue(vehicleId?: bigint) {
  const { address: userAddress } = useAccount();
  return useClaimableRevenue(userAddress, vehicleId);
}

/**
 * Claim revenue for a vehicle
 */
export function useClaimRevenue() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const claimRevenue = (vehicleId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "claimRevenue",
      args: [vehicleId],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { claimRevenue, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Batch claim revenue for multiple vehicles
 */
export function useBatchClaimRevenue() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const batchClaim = (vehicleIds: bigint[]) => {
    writeContract({
      address,
      abi,
      functionName: "batchClaimRevenue",
      args: [vehicleIds],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { batchClaim, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Get vehicle revenue info
 */
export function useVehicleRevenue(vehicleId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleRevenue",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}

/**
 * Calculate revenue waterfall breakdown
 */
export function useRevenueWaterfall(grossRevenue?: bigint) {
  const { address, abi } = useRevenueDistributor();

  return useReadContract({
    address,
    abi,
    functionName: "calculateWaterfall",
    args: grossRevenue !== undefined ? [grossRevenue] : undefined,
    query: {
      enabled: grossRevenue !== undefined,
    },
  });
}
