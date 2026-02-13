/**
 * Compliance Status Hook
 * Checks user's compliance status for investor/rentor roles
 */

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useUserStore } from "@/store/userStore";
import { useIdentityRegistry } from "./useContracts";
import { kycApi } from "@/lib/api";

export interface ComplianceStatus {
  // Wallet status
  hasWalletBound: boolean; // User has wallet address in database
  isWalletConnected: boolean; // Wallet is currently connected via MetaMask
  walletAddress: string | null; // Bound wallet address from database

  // KYC verification status
  isKYCApproved: boolean; // KYC approved in database

  // Blockchain verification status
  isVerifiedOnChain: boolean; // Identity verified in IdentityRegistry contract
  isLoading: boolean; // Loading verification status

  // Overall compliance
  isFullyCompliant: boolean; // All requirements met
  missingSteps: string[]; // List of missing requirements
}

/**
 * Hook to check user's compliance status
 * Combines database wallet binding + KYC approval + blockchain identity verification
 */
export function useComplianceStatus(): ComplianceStatus {
  const { user } = useUserStore();
  const { address: connectedAddress, isConnected } = useAccount();
  const { address: identityRegistryAddress, abi } = useIdentityRegistry();

  const [isKYCApproved, setIsKYCApproved] = useState(false);
  const [isLoadingKYC, setIsLoadingKYC] = useState(true);

  // Get bound wallet from user profile (stored in database)
  const boundWalletAddress = user?.walletAddress as `0x${string}` | undefined;
  const hasWalletBound = !!boundWalletAddress;

  // Check KYC status from database
  useEffect(() => {
    const checkKYCStatus = async () => {
      if (!user) {
        setIsKYCApproved(false);
        setIsLoadingKYC(false);
        return;
      }

      try {
        const response = await kycApi.getStatus();
        setIsKYCApproved(response.success && response.data.status === "approved");
      } catch (error) {
        console.error("Failed to check KYC status:", error);
        setIsKYCApproved(false);
      } finally {
        setIsLoadingKYC(false);
      }
    };

    checkKYCStatus();
  }, [user]);

  // Check if bound wallet is verified in IdentityRegistry
  const {
    data: isVerified,
    isLoading: isLoadingBlockchain,
  } = useReadContract({
    address: identityRegistryAddress,
    abi,
    functionName: "isVerified",
    args: boundWalletAddress ? [boundWalletAddress] : undefined,
    query: {
      enabled: !!boundWalletAddress,
    },
  });

  const isVerifiedOnChain = isVerified === true;

  // Check if connected wallet matches bound wallet
  const isCorrectWalletConnected =
    isConnected &&
    connectedAddress &&
    boundWalletAddress &&
    connectedAddress.toLowerCase() === boundWalletAddress.toLowerCase();

  // Determine missing steps
  const missingSteps: string[] = [];
  if (!hasWalletBound) {
    missingSteps.push("Connect and bind your wallet to your account");
  }
  if (hasWalletBound && !isCorrectWalletConnected) {
    missingSteps.push("Connect your registered wallet");
  }
  if (hasWalletBound && !isKYCApproved && !isVerifiedOnChain) {
    missingSteps.push("Complete KYC verification");
  }

  // User is fully compliant if:
  // 1. Has wallet bound in database
  // 2. Wallet is connected via MetaMask
  // 3. KYC is approved in database OR verified on blockchain
  const isFullyCompliant =
    hasWalletBound && isCorrectWalletConnected && (isKYCApproved || isVerifiedOnChain);

  return {
    hasWalletBound,
    isWalletConnected: isConnected,
    walletAddress: boundWalletAddress || null,
    isKYCApproved,
    isVerifiedOnChain,
    isLoading: isLoadingKYC || isLoadingBlockchain,
    isFullyCompliant,
    missingSteps,
  };
}

/**
 * Hook to check if user can perform investor actions
 */
export function useCanInvestorAct(): {
  canAct: boolean;
  reason: string | null;
  isLoading: boolean;
} {
  const { user } = useUserStore();
  const compliance = useComplianceStatus();

  if (compliance.isLoading) {
    return { canAct: false, reason: null, isLoading: true };
  }

  if (user?.role !== "investor") {
    return {
      canAct: false,
      reason: "You must be registered as an investor",
      isLoading: false,
    };
  }

  if (!compliance.isFullyCompliant) {
    return {
      canAct: false,
      reason: compliance.missingSteps[0] || "Compliance requirements not met",
      isLoading: false,
    };
  }

  return { canAct: true, reason: null, isLoading: false };
}

/**
 * Hook to check if user can perform rentor actions
 */
export function useCanRentorAct(): {
  canAct: boolean;
  reason: string | null;
  isLoading: boolean;
} {
  const { user } = useUserStore();
  const compliance = useComplianceStatus();

  if (compliance.isLoading) {
    return { canAct: false, reason: null, isLoading: true };
  }

  if (user?.role !== "rentor") {
    return {
      canAct: false,
      reason: "You must be registered as a vehicle owner",
      isLoading: false,
    };
  }

  if (!compliance.isFullyCompliant) {
    return {
      canAct: false,
      reason: compliance.missingSteps[0] || "Compliance requirements not met",
      isLoading: false,
    };
  }

  return { canAct: true, reason: null, isLoading: false };
}
