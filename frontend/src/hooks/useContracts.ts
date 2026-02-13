/**
 * Contract Hooks
 * Custom hooks for interacting with RegShield smart contracts
 */

import { useChainId } from "wagmi";
import { getContracts } from "@/constants/contracts";
import { ABIS } from "@/contracts/abis";

/**
 * Get all contract addresses for the current chain
 */
export function useContractAddresses() {
  const chainId = useChainId();
  return getContracts(chainId);
}

/**
 * Get contract configuration (address + ABI) for a specific contract
 */
export function useContract<T extends keyof typeof ABIS>(contractName: T) {
  const contracts = useContractAddresses();

  // Map contract names to their respective keys in the contracts object
  const addressKey: Record<keyof typeof ABIS, keyof typeof contracts> = {
    vehicleNFT: "vehicleNFT",
    rentalBooking: "rentalBooking",
    rentalOperations: "rentalOperations",
    paymentToken: "paymentToken",
    rentalPaymentProtocol: "rentalPaymentProtocol",
    investorRequestManager: "investorRequestManager",
    revenueDistributor: "revenueDistributor",
    identityRegistry: "identityRegistry",
  };

  return {
    address: contracts[addressKey[contractName]],
    abi: ABIS[contractName],
  };
}

/**
 * Export individual contract hooks for convenience
 */
export const useVehicleNFT = () => useContract("vehicleNFT");
export const useRentalBooking = () => useContract("rentalBooking");
export const useRentalOperations = () => useContract("rentalOperations");
export const usePaymentToken = () => useContract("paymentToken");
export const useRentalPaymentProtocol = () => useContract("rentalPaymentProtocol");
export const useInvestorRequestManager = () => useContract("investorRequestManager");
export const useRevenueDistributor = () => useContract("revenueDistributor");
export const useIdentityRegistry = () => useContract("identityRegistry");
