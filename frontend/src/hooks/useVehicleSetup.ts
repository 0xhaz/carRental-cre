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

/**
 * Set RevenueDistributor address on a deployed RevenueToken
 * RevenueToken.setRevenueDistributor(distributorAddress)
 * Only the token owner can call this.
 */
const SET_REVENUE_DISTRIBUTOR_ABI = [
  {
    type: "function",
    name: "setRevenueDistributor",
    inputs: [{ name: "_revenueDistributor", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export function useSetRevenueTokenDistributor() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const setDistributor = (revenueTokenAddress: `0x${string}`) => {
    writeContract({
      address: revenueTokenAddress,
      abi: SET_REVENUE_DISTRIBUTOR_ABI,
      functionName: "setRevenueDistributor",
      args: [SEPOLIA_CONTRACTS.revenueDistributor],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  return { setDistributor, hash, isConfirming, isSuccess, isPending, error };
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

/**
 * Look up the AssetToken and RevenueToken addresses for a vehicle
 * PaymentProtocol.vehicleTokens(vehicleId) → (assetToken, revenueToken)
 */
export function useVehicleTokenAddresses(vehicleId?: bigint) {
  const { address, abi } = useRegShieldPaymentProtocol();
  const { data, ...rest } = useReadContract({
    address,
    abi,
    functionName: "vehicleTokens",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: { enabled: vehicleId !== undefined },
  });

  const result = data as [string, string] | undefined;
  const assetToken = result?.[0] && result[0] !== "0x0000000000000000000000000000000000000000"
    ? (result[0] as `0x${string}`)
    : undefined;
  const revenueToken = result?.[1] && result[1] !== "0x0000000000000000000000000000000000000000"
    ? (result[1] as `0x${string}`)
    : undefined;

  return { assetToken, revenueToken, ...rest };
}

// Minimal ABI for Token.addAgent and Token.isAgent
const TOKEN_AGENT_ABI = [
  {
    type: "function",
    name: "addAgent",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isAgent",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

/**
 * Check if an address is a registered agent on a token contract
 * Used to verify PaymentProtocol can mint tokens
 */
export function useIsTokenAgent(tokenAddress?: `0x${string}`, agentAddress?: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: TOKEN_AGENT_ABI,
    functionName: "isAgent",
    args: agentAddress ? [agentAddress] : undefined,
    query: { enabled: !!tokenAddress && !!agentAddress },
  });
}

/**
 * Add an agent to a token contract (enables minting)
 * Token.addAgent(agentAddress) — only the token owner can call this
 */
export function useAddTokenAgent() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const addAgent = (tokenAddress: `0x${string}`, agentAddress: `0x${string}`) => {
    writeContract({
      address: tokenAddress,
      abi: TOKEN_AGENT_ABI,
      functionName: "addAgent",
      args: [agentAddress],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  return { addAgent, hash, isConfirming, isSuccess, isPending, error };
}
