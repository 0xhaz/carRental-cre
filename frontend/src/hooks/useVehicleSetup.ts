/**
 * Vehicle Setup Hooks
 * Hooks for registering vehicle tokens on PaymentProtocol and RevenueDistributor.
 * NOTE: These functions are onlyOwner — only the contract deployer (admin) can call them.
 */

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useRegShieldPaymentProtocol, useRevenueDistributor } from "./useContracts";
import { parseGwei } from "viem";
import { SEPOLIA_CONTRACTS } from "@/constants/contracts";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

/**
 * Register vehicle tokens on PaymentProtocol
 * PaymentProtocol.registerVehicleTokens(vehicleId, assetToken, revenueToken)
 */
export function useRegisterVehicleTokens() {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const register = (vehicleId: bigint, assetToken: `0x${string}`, revenueToken: `0x${string}`) => {
    writeContract({
      address,
      abi,
      functionName: "registerVehicleTokens",
      args: [vehicleId, assetToken, revenueToken],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  return { register, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Register vehicle on RevenueDistributor
 * RevenueDistributor.registerVehicle(vehicleId, revenueToken)
 */
export function useRegisterVehicleRevenue() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const register = (vehicleId: bigint, revenueToken: `0x${string}`) => {
    writeContract({
      address,
      abi,
      functionName: "registerVehicle",
      args: [vehicleId, revenueToken],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  return { register, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Set vehicle operator on RevenueDistributor
 * RevenueDistributor.setVehicleOperator(vehicleId, operator)
 */
export function useSetVehicleOperator() {
  const { address, abi } = useRevenueDistributor();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const setOperator = (vehicleId: bigint, operator: `0x${string}`) => {
    writeContract({
      address,
      abi,
      functionName: "setVehicleOperator",
      args: [vehicleId, operator],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  return { setOperator, hash, isConfirming, isSuccess, isPending, error };
}

// Minimal ABI for Token.setCompliance and Token.compliance
const TOKEN_COMPLIANCE_ABI = [
  {
    type: "function",
    name: "setCompliance",
    inputs: [{ name: "compliance_", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "compliance",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

/**
 * Check if a token's compliance module is up-to-date
 */
export function useTokenCompliance(tokenAddress: `0x${string}` | undefined) {
  const { data: currentCompliance } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_COMPLIANCE_ABI,
    functionName: "compliance",
    query: { enabled: !!tokenAddress },
  });

  const expectedCompliance = SEPOLIA_CONTRACTS.complianceRules.toLowerCase();
  const needsUpdate = currentCompliance
    ? (currentCompliance as string).toLowerCase() !== expectedCompliance
    : false;

  return { currentCompliance, needsUpdate };
}

/**
 * Update compliance module on a token contract
 * Only the token owner can call this
 */
export function useUpdateTokenCompliance() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const updateCompliance = (tokenAddress: `0x${string}`) => {
    writeContract({
      address: tokenAddress,
      abi: TOKEN_COMPLIANCE_ABI,
      functionName: "setCompliance",
      args: [SEPOLIA_CONTRACTS.complianceRules],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  return { updateCompliance, hash, isConfirming, isSuccess, isPending, error };
}
