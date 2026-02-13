/**
 * Investment Hooks
 * Hooks for interacting with the investment system
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useInvestorRequestManager, useRevenueDistributor } from "./useContracts";
import { parseUnits, formatUnits } from "viem";
import { PAYMENT_TOKEN_DECIMALS } from "@/constants";

/**
 * Get investment opportunities for a vehicle
 */
export function useVehicleInvestmentInfo(vehicleId: bigint | undefined) {
  const { address, abi } = useInvestorRequestManager();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleInvestmentInfo",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}

/**
 * Get user's investments
 */
export function useUserInvestments(userAddress?: `0x${string}`) {
  const { address, abi } = useInvestorRequestManager();

  return useReadContract({
    address,
    abi,
    functionName: "getUserInvestments",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}

/**
 * Get my investments
 */
export function useMyInvestments() {
  const { address: userAddress } = useAccount();
  return useUserInvestments(userAddress);
}

/**
 * Get investment details by ID
 */
export function useInvestmentDetails(investmentId: bigint | undefined) {
  const { address, abi } = useInvestorRequestManager();

  return useReadContract({
    address,
    abi,
    functionName: "getInvestment",
    args: investmentId !== undefined ? [investmentId] : undefined,
    query: {
      enabled: investmentId !== undefined,
    },
  });
}

/**
 * Check if user can invest in a vehicle
 */
export function useCanInvest(vehicleId: bigint | undefined, amount: bigint | undefined) {
  const { address, abi } = useInvestorRequestManager();
  const { address: userAddress } = useAccount();

  return useReadContract({
    address,
    abi,
    functionName: "canInvest",
    args: userAddress && vehicleId !== undefined && amount !== undefined
      ? [userAddress, vehicleId, amount]
      : undefined,
    query: {
      enabled: !!userAddress && vehicleId !== undefined && amount !== undefined,
    },
  });
}

/**
 * Create an investment request
 */
export function useCreateInvestment() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, ...rest } = useWriteContract();

  const createInvestment = (vehicleId: bigint, amount: string) => {
    const amountWei = parseUnits(amount, PAYMENT_TOKEN_DECIMALS);
    writeContract({
      address,
      abi,
      functionName: "createInvestmentRequest",
      args: [vehicleId, amountWei],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    createInvestment,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

/**
 * Withdraw investment
 */
export function useWithdrawInvestment() {
  const { address, abi } = useInvestorRequestManager();
  const { data: hash, writeContract, ...rest } = useWriteContract();

  const withdrawInvestment = (investmentId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "withdrawInvestment",
      args: [investmentId],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    withdrawInvestment,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

/**
 * Get claimable revenue for an investor
 */
export function useClaimableRevenue(investorAddress?: `0x${string}`, vehicleId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  const result = useReadContract({
    address,
    abi,
    functionName: "getClaimableRevenue",
    args: investorAddress && vehicleId !== undefined ? [investorAddress, vehicleId] : undefined,
    query: {
      enabled: !!investorAddress && vehicleId !== undefined,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatUnits(result.data as bigint, PAYMENT_TOKEN_DECIMALS) : "0",
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
 * Claim revenue
 */
export function useClaimRevenue() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, ...rest } = useWriteContract();

  const claimRevenue = (vehicleId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "claimRevenue",
      args: [vehicleId],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    claimRevenue,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

/**
 * Get total revenue distributed for a vehicle
 */
export function useTotalRevenueDistributed(vehicleId?: bigint) {
  const { address, abi } = useRevenueDistributor();

  const result = useReadContract({
    address,
    abi,
    functionName: "getTotalRevenueDistributed",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatUnits(result.data as bigint, PAYMENT_TOKEN_DECIMALS) : "0",
  };
}
