/**
 * Contract Hooks
 * Custom hooks for interacting with RegShield smart contracts
 */

import { useChainId } from "wagmi";
import { getContracts, type ContractAddresses } from "@/constants/contracts";
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

  // Map ABI keys to their respective contract address keys
  const addressKey: Record<keyof typeof ABIS, keyof ContractAddresses> = {
    vehicleNFT: "vehicleNFT",
    rentalBooking: "rentalBooking",
    rentalOperations: "rentalOperations",
    identityRegistry: "identityRegistry",
    regShieldPaymentProtocol: "investmentPaymentProtocol",
    rentalPaymentProtocol: "rentalPaymentProtocol",
    paymentEscrow: "investmentEscrow",
    refundManager: "investmentRefundManager",
    disputeResolver: "disputeResolver",
    investorRequestManager: "investorRequestManager",
    revenueDistributor: "revenueDistributor",
    multiSigWallet: "multiSigWallet",
    complianceRules: "complianceRules",
    investorTypeRegistry: "investorTypeRegistry",
    participantTypeRegistry: "participantTypeRegistry",
  };

  return {
    address: contracts[addressKey[contractName]],
    abi: ABIS[contractName],
  };
}

/**
 * Individual contract hooks
 */
// Core
export const useVehicleNFT = () => useContract("vehicleNFT");
export const useRentalBooking = () => useContract("rentalBooking");
export const useRentalOperations = () => useContract("rentalOperations");
export const useIdentityRegistry = () => useContract("identityRegistry");

// Payment system (native ETH)
export const useRegShieldPaymentProtocol = () => useContract("regShieldPaymentProtocol");
export const useRentalPaymentProtocol = () => useContract("rentalPaymentProtocol");
export const usePaymentEscrow = () => useContract("paymentEscrow");
export const useRefundManager = () => useContract("refundManager");
export const useDisputeResolver = () => useContract("disputeResolver");

// Investor & Revenue
export const useInvestorRequestManager = () => useContract("investorRequestManager");
export const useRevenueDistributor = () => useContract("revenueDistributor");
export const useMultiSigWallet = () => useContract("multiSigWallet");

// Compliance & Registries
export const useComplianceRules = () => useContract("complianceRules");
export const useInvestorTypeRegistry = () => useContract("investorTypeRegistry");
export const useParticipantTypeRegistry = () => useContract("participantTypeRegistry");
