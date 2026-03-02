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
import { MULTI_SIG_WALLET_ABI } from "@/contracts/abis";
import { parseEther, formatEther, parseGwei } from "viem";

// Sepolia gas overrides — wagmi's default gas estimation often underestimates maxFeePerGas
const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

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
      ...SEPOLIA_GAS_OVERRIDES,
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
      ...SEPOLIA_GAS_OVERRIDES,
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
      ...SEPOLIA_GAS_OVERRIDES,
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
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { confirmLocked, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Read locked balance from an investor's MultiSig wallet
 */
export function useMultiSigLockedBalance(walletAddress?: string) {
  const addr = walletAddress as `0x${string}` | undefined;

  const result = useReadContract({
    address: addr,
    abi: MULTI_SIG_WALLET_ABI,
    functionName: "getLockedBalance",
    query: {
      enabled: !!addr && addr !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 10_000,
    },
  });

  return {
    ...result,
    lockedAmount: result.data as bigint | undefined,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Lock funds in an investor's MultiSig wallet (sends ETH)
 */
export function useMultiSigLockFunds() {
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const lockFundsInMultiSig = (walletAddress: string, amountEth: string) => {
    writeContract({
      address: walletAddress as `0x${string}`,
      abi: MULTI_SIG_WALLET_ABI,
      functionName: "lockFunds",
      value: parseEther(amountEth),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { lockFundsInMultiSig, hash, isConfirming, isSuccess, ...rest };
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
  const { data: hash, writeContract, isPending, error } = useWriteContract();

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
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { invest, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Initiate a rentor co-investment for a vehicle they own (sends ETH)
 * Bypasses CannotPaySelf and investor compliance checks on-chain.
 * msg.value = co-investment amount + escrow fee
 */
export function useInitiateRentorCoInvestment() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const coInvest = (
    vehicleId: bigint,
    amount: bigint,
    reason: string,
    totalValueWithFee: bigint,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "initiateRentorCoInvestment",
      args: [vehicleId, amount, reason],
      value: totalValueWithFee,
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { coInvest, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Read payment settings from RegShieldPaymentProtocol (min/max amounts, escrow fee rate)
 */
export function usePaymentSettings() {
  const { address, abi } = useRegShieldPaymentProtocol();

  const result = useReadContract({
    address,
    abi,
    functionName: "paymentSettings",
  });

  const settings = result.data as
    | [bigint, bigint, bigint, bigint, bigint, bigint]
    | undefined;

  return {
    ...result,
    confirmationPeriod: settings?.[0],
    disputeWindow: settings?.[1],
    refundWindow: settings?.[2],
    maxPaymentAmount: settings?.[3],
    minPaymentAmount: settings?.[4],
    escrowFeeRate: settings?.[5],
  };
}

/**
 * Get rentor co-investment amount for a vehicle (on-chain)
 */
export function useRentorCoInvestment(vehicleId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();

  const result = useReadContract({
    address,
    abi,
    functionName: "getRentorCoInvestment",
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
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
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
      gas: BigInt(500_000) * BigInt(vehicleIds.length || 1),
      ...SEPOLIA_GAS_OVERRIDES,
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

// ═══════════════════════════════════════════════
// Revenue Distribution Records
// ═══════════════════════════════════════════════

/**
 * Get all distribution records for a vehicle
 */
export function useVehicleDistributions(vehicleId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleDistributions",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}

/**
 * Get a specific distribution record
 */
export function useDistributionRecord(vehicleId?: bigint, distributionId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  return useReadContract({
    address,
    abi,
    functionName: "getDistributionRecord",
    args:
      vehicleId !== undefined && distributionId !== undefined
        ? [vehicleId, distributionId]
        : undefined,
    query: {
      enabled: vehicleId !== undefined && distributionId !== undefined,
    },
  });
}

/**
 * Get the total amount distributed across all vehicles
 */
export function useTotalDistributed() {
  const { address, abi } = useRevenueDistributor();

  const result = useReadContract({
    address,
    abi,
    functionName: "getTotalDistributed",
    query: { enabled: true },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

// ═══════════════════════════════════════════════
// Milestone Management (Admin)
// ═══════════════════════════════════════════════

/**
 * Complete a milestone for a payment (onlyOwner)
 * Contract expects string names: "VEHICLE_IDENTIFIED", "PURCHASE_VERIFIED", "INSURANCE_OBTAINED", "REGISTRATION_COMPLETED"
 */
const MILESTONE_STRINGS = [
  "VEHICLE_IDENTIFIED",
  "PURCHASE_VERIFIED",
  "INSURANCE_OBTAINED",
  "REGISTRATION_COMPLETED",
] as const;

export function useCompleteMilestone() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const completeMilestone = (paymentId: bigint, milestoneIndex: number) => {
    const milestoneName = MILESTONE_STRINGS[milestoneIndex];
    if (!milestoneName) return;
    // Last milestone (REGISTRATION_COMPLETED) auto-triggers fund release + token minting
    // which needs significantly more gas than simple milestone updates
    const isLastMilestone = milestoneIndex === 3;
    writeContract({
      address,
      abi,
      functionName: "completeMilestone",
      args: [paymentId, milestoneName],
      ...SEPOLIA_GAS_OVERRIDES,
      ...(isLastMilestone ? { gas: BigInt(1_000_000) } : {}),
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { completeMilestone, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Release milestone funds after all milestones complete (onlyOwner)
 */
export function useReleaseMilestoneFunds() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const releaseFunds = (paymentId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "releaseMilestoneFunds",
      args: [paymentId],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { releaseFunds, hash, isConfirming, isSuccess, isPending, error };
}

// ═══════════════════════════════════════════════
// Vehicle-Level Milestone Management (Admin)
// ═══════════════════════════════════════════════

/**
 * Complete a vehicle-level milestone (applies to ALL payments for the vehicle)
 * When all 4 milestones complete, auto-releases all pending payments and mints tokens.
 */
export function useCompleteVehicleMilestone() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const completeVehicleMilestone = (vehicleId: bigint, milestoneIndex: number) => {
    const milestoneName = MILESTONE_STRINGS[milestoneIndex];
    if (!milestoneName) return;
    // Last milestone auto-triggers batch fund release + token minting for ALL payments
    const isLastMilestone = milestoneIndex === 3;
    writeContract({
      address,
      abi,
      functionName: "completeVehicleMilestone",
      args: [vehicleId, milestoneName],
      ...SEPOLIA_GAS_OVERRIDES,
      ...(isLastMilestone ? { gas: BigInt(3_000_000) } : {}),
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { completeVehicleMilestone, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Read vehicle-level milestone status
 */
export function useVehicleMilestoneStatus(vehicleId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();
  return useReadContract({
    address,
    abi,
    functionName: "getVehicleMilestoneStatus",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}

/**
 * Manually release all pending payments for a vehicle (onlyOwner)
 */
export function useReleaseAllVehiclePayments() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const releaseAll = (vehicleId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "releaseAllVehiclePayments",
      args: [vehicleId],
      ...SEPOLIA_GAS_OVERRIDES,
      gas: BigInt(3_000_000),
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { releaseAll, hash, isConfirming, isSuccess, isPending, error };
}

// ═══════════════════════════════════════════════
// Revenue Admin (Add & Distribute)
// ═══════════════════════════════════════════════

/**
 * Add revenue to a vehicle (sends ETH)
 * RevenueDistributor.addRevenue(vehicleId, 0) { value: amount }
 */
export function useAddRevenue() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const addRevenue = (vehicleId: bigint, amountWei: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "addRevenue",
      args: [vehicleId, BigInt(0)],
      value: amountWei,
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { addRevenue, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Distribute accumulated revenue for a vehicle
 */
export function useDistributeRevenue() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const distributeRevenue = (vehicleId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "distributeRevenue",
      args: [vehicleId],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { distributeRevenue, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Withdraw accumulated operator fees for a vehicle
 */
export function useWithdrawOperatorFees() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const withdrawFees = (vehicleId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "withdrawOperatorFees",
      args: [vehicleId],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { withdrawFees, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Get operator fees for a vehicle (read)
 */
export function useOperatorFees(vehicleId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  const result = useReadContract({
    address,
    abi,
    functionName: "getOperatorFees",
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
 * Get accumulated platform fees (read)
 */
export function usePlatformFees() {
  const { address, abi } = useRevenueDistributor();

  const result = useReadContract({
    address,
    abi,
    functionName: "getPlatformFees",
    query: { enabled: true },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Withdraw accumulated platform fees (owner only)
 */
export function useWithdrawPlatformFees() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const withdraw = (recipient: `0x${string}`) => {
    writeContract({
      address,
      abi,
      functionName: "withdrawPlatformFees",
      args: [recipient],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { withdraw, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Get maintenance reserve for a vehicle (read)
 */
export function useMaintenanceReserve(vehicleId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  const result = useReadContract({
    address,
    abi,
    functionName: "getMaintenanceReserve",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: { enabled: vehicleId !== undefined },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Withdraw maintenance reserve for a vehicle (owner only)
 */
export function useWithdrawMaintenanceReserve() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const withdraw = (vehicleId: bigint, recipient: `0x${string}`, amount: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "withdrawMaintenanceReserve",
      args: [vehicleId, recipient, amount],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { withdraw, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Get vehicle operator address (read)
 */
export function useVehicleOperator(vehicleId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleOperator",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}

// ═══════════════════════════════════════════════
// RegShieldPaymentProtocol — Payment Reads
// ═══════════════════════════════════════════════

/**
 * Get payment state enum
 */
export function usePaymentState(paymentId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "getPaymentState",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: { enabled: paymentId !== undefined },
  });
}

/**
 * Check if a payment has expired
 */
export function useIsPaymentExpired(paymentId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "isPaymentExpired",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: { enabled: paymentId !== undefined },
  });
}

/**
 * Check if a payment can be disputed
 */
export function useCanDispute(paymentId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "canDispute",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: { enabled: paymentId !== undefined },
  });
}

/**
 * Get all payment IDs for a payer
 */
export function usePaymentsByPayer(payer?: `0x${string}`) {
  const { address, abi } = useRegShieldPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "getPaymentsByPayer",
    args: payer ? [payer] : undefined,
    query: { enabled: !!payer },
  });
}

/**
 * Get all payment IDs for a payee
 */
export function usePaymentsByPayee(payee?: `0x${string}`) {
  const { address, abi } = useRegShieldPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "getPaymentsByPayee",
    args: payee ? [payee] : undefined,
    query: { enabled: !!payee },
  });
}

/** Get current user's payments as payer */
export function useMyPaymentsAsPayer() {
  const { address: userAddress } = useAccount();
  return usePaymentsByPayer(userAddress);
}

/** Get current user's payments as payee */
export function useMyPaymentsAsPayee() {
  const { address: userAddress } = useAccount();
  return usePaymentsByPayee(userAddress);
}

// ═══════════════════════════════════════════════
// RegShieldPaymentProtocol — Payment Writes
// ═══════════════════════════════════════════════

/**
 * Initiate a new payment
 */
export function useInitiatePayment() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const initiatePayment = (
    payee: `0x${string}`,
    amount: bigint,
    reason: string,
    value: bigint,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "initiatePayment",
      args: [payee, amount, reason],
      value,
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { initiatePayment, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Confirm a payment (payee only)
 */
export function useConfirmPayment() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const confirmPayment = (paymentId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "confirmPayment",
      args: [paymentId],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { confirmPayment, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Dispute a payment (payer only)
 */
export function useDisputePayment() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const disputePayment = (paymentId: bigint, reason: string) => {
    writeContract({
      address,
      abi,
      functionName: "disputePayment",
      args: [paymentId, reason],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { disputePayment, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Cancel a payment (payer only)
 */
export function useCancelPayment() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const cancelPayment = (paymentId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "cancelPayment",
      args: [paymentId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { cancelPayment, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Emergency refund a payment (owner only)
 */
export function useEmergencyRefundPayment() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const emergencyRefund = (paymentId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "emergencyRefund",
      args: [paymentId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { emergencyRefund, hash, isConfirming, isSuccess, isPending, error };
}

// ═══════════════════════════════════════════════
// RevenueDistributor — Admin Functions
// ═══════════════════════════════════════════════

/**
 * Check if a vehicle is registered in the revenue distributor
 */
export function useIsVehicleRegistered(vehicleId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  return useReadContract({
    address,
    abi,
    functionName: "isVehicleRegistered",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: { enabled: vehicleId !== undefined },
  });
}

/**
 * Register a vehicle in the revenue distributor (owner only)
 */
export function useRegisterVehicle() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const registerVehicle = (vehicleId: bigint, revenueToken: `0x${string}`) => {
    writeContract({
      address,
      abi,
      functionName: "registerVehicle",
      args: [vehicleId, revenueToken],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { registerVehicle, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Set vehicle operator (owner only)
 */
export function useSetVehicleOperator() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const setOperator = (vehicleId: bigint, operator: `0x${string}`) => {
    writeContract({
      address,
      abi,
      functionName: "setVehicleOperator",
      args: [vehicleId, operator],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { setOperator, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Batch distribute revenue for multiple vehicles
 */
export function useBatchDistribute() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const batchDistribute = (vehicleIds: bigint[]) => {
    writeContract({
      address,
      abi,
      functionName: "batchDistribute",
      args: [vehicleIds],
      gas: BigInt(3_000_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { batchDistribute, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Update revenue fee percentages (owner only)
 */
export function useUpdateFeePercentages() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const updateFees = (
    platformFee: bigint,
    maintenanceFee: bigint,
    insuranceFee: bigint,
    operatingFee: bigint,
    operatorFee: bigint,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "updateFeePercentages",
      args: [platformFee, maintenanceFee, insuranceFee, operatingFee, operatorFee],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { updateFees, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Set authorized revenue source (owner only)
 */
export function useSetAuthorizedSource() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const setSource = (source: `0x${string}`, authorized: boolean) => {
    writeContract({
      address,
      abi,
      functionName: "setAuthorizedSource",
      args: [source, authorized],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { setSource, hash, isConfirming, isSuccess, isPending, error };
}

// ═══════════════════════════════════════════════
// InvestorRequestManager — Admin Functions
// ═══════════════════════════════════════════════

/**
 * Approve an investor request (bank only)
 */
export function useApproveInvestorRequest() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const approve = (user: `0x${string}`) => {
    writeContract({
      address,
      abi,
      functionName: "approveRequest",
      args: [user],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { approve, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Reject an investor request (bank only)
 */
export function useRejectInvestorRequest() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const reject = (user: `0x${string}`, reason: string) => {
    writeContract({
      address,
      abi,
      functionName: "rejectRequest",
      args: [user, reason],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { reject, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Create a multi-sig wallet for an investor (bank/owner only)
 */
export function useCreateMultiSigWallet() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const createWallet = (user: `0x${string}`) => {
    writeContract({
      address,
      abi,
      functionName: "createMultiSigWallet",
      args: [user],
      gas: BigInt(1_000_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { createWallet, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Create a multi-sig wallet for investor upgrade (bank/owner only)
 */
export function useCreateMultiSigWalletForUpgrade() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const createWallet = (user: `0x${string}`) => {
    writeContract({
      address,
      abi,
      functionName: "createMultiSigWalletForUpgrade",
      args: [user],
      gas: BigInt(1_000_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { createWallet, hash, isConfirming, isSuccess, isPending, error };
}

// Display labels for PaymentState enum
export const PAYMENT_STATE_LABELS: Record<number, string> = {
  0: "Initiated",
  1: "Escrowed",
  2: "Confirmed",
  3: "Disputed",
  4: "Refunded",
  5: "Cancelled",
  6: "Completed",
  7: "Expired",
};
