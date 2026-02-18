/**
 * Compliance Status Hook
 * Checks user's compliance status for investor/rentor roles
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useUserStore } from "@/store/userStore";
import { useIdentityRegistry, useWorldIDVerifier } from "./useContracts";
import { kycApi, type UpgradeRequest } from "@/lib/api";

export interface ComplianceStatus {
  // Wallet status
  hasWalletBound: boolean; // User has wallet address in database
  isWalletConnected: boolean; // Wallet is currently connected via MetaMask
  walletAddress: string | null; // Bound wallet address from database

  // KYC verification status
  isKYCApproved: boolean; // KYC approved in database
  kycStatus: string | null; // Raw KYC status from API
  investorType: number | null; // 1=RETAIL, 2=ACCREDITED, 3=INSTITUTIONAL

  // Blockchain verification status
  isVerifiedOnChain: boolean; // Identity verified in IdentityRegistry contract
  isWorldIDVerified: boolean; // World ID proof of personhood verified
  isLoading: boolean; // Loading verification status

  // Overall compliance
  isFullyCompliant: boolean; // All requirements met
  missingSteps: string[]; // List of missing requirements

  // Upgrade request status
  upgradeRequest: UpgradeRequest | null;

  // Actions
  refetchKYC: () => Promise<void>; // Manually refetch KYC status
}

// Polling interval for KYC status (30 seconds)
const KYC_POLL_INTERVAL = 30_000;

/**
 * Hook to check user's compliance status
 * Combines database wallet binding + KYC approval + blockchain identity verification
 */
export function useComplianceStatus(): ComplianceStatus {
  const { user } = useUserStore();
  const { address: connectedAddress, isConnected } = useAccount();
  const { address: identityRegistryAddress, abi } = useIdentityRegistry();
  const { address: worldIDVerifierAddress, abi: worldIDAbi } = useWorldIDVerifier();

  const [isKYCApproved, setIsKYCApproved] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [investorType, setInvestorType] = useState<number | null>(null);
  const [upgradeRequest, setUpgradeRequest] = useState<UpgradeRequest | null>(null);
  const [isLoadingKYC, setIsLoadingKYC] = useState(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get bound wallet from user profile (stored in database)
  const boundWalletAddress = user?.walletAddress as `0x${string}` | undefined;
  const hasWalletBound = !!boundWalletAddress;

  // Fetch KYC status from database
  const fetchKYCStatus = useCallback(async () => {
    if (!user) {
      setIsKYCApproved(false);
      setKycStatus(null);
      setUpgradeRequest(null);
      setIsLoadingKYC(false);
      return;
    }

    try {
      const response = await kycApi.getStatus();
      const status = response.success ? response.data.status : "not_submitted";
      setKycStatus(status);
      setIsKYCApproved(status === "approved");
      setInvestorType(response.success ? response.data.investorType ?? null : null);
      setUpgradeRequest(response.success ? response.data.upgradeRequest ?? null : null);
    } catch (error) {
      console.error("Failed to check KYC status:", error);
      setIsKYCApproved(false);
      setKycStatus(null);
      setInvestorType(null);
      setUpgradeRequest(null);
    } finally {
      setIsLoadingKYC(false);
    }
  }, [user]);

  // Initial fetch + polling for KYC status
  useEffect(() => {
    fetchKYCStatus();

    // Poll for updates when KYC is not yet approved (pending/under_review)
    pollIntervalRef.current = setInterval(() => {
      fetchKYCStatus();
    }, KYC_POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchKYCStatus]);

  // Stop polling once KYC is approved
  useEffect(() => {
    if (isKYCApproved && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, [isKYCApproved]);

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

  // Check World ID verification status
  const {
    data: isWorldIDVerifiedData,
    isLoading: isLoadingWorldID,
  } = useReadContract({
    address: worldIDVerifierAddress,
    abi: worldIDAbi,
    functionName: "isWorldIDVerified",
    args: boundWalletAddress ? [boundWalletAddress] : undefined,
    query: {
      enabled: !!boundWalletAddress,
    },
  });

  const isWorldIDVerified = isWorldIDVerifiedData === true;

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
    if (kycStatus === "pending" || kycStatus === "under_review") {
      missingSteps.push("KYC documents under review — awaiting approval");
    } else if (kycStatus === "rejected") {
      missingSteps.push("KYC was rejected — please resubmit documents");
    } else {
      missingSteps.push("Complete KYC verification");
    }
  }

  // User is fully compliant if:
  // 1. Has wallet bound in database
  // 2. Wallet is connected via MetaMask
  // 3. KYC is approved in database OR verified on blockchain
  const isFullyCompliant =
    hasWalletBound && !!isCorrectWalletConnected && (isKYCApproved || isVerifiedOnChain);

  return {
    hasWalletBound,
    isWalletConnected: isConnected,
    walletAddress: boundWalletAddress || null,
    isKYCApproved,
    kycStatus,
    investorType,
    isVerifiedOnChain,
    isWorldIDVerified,
    isLoading: isLoadingKYC || isLoadingBlockchain || isLoadingWorldID,
    isFullyCompliant,
    missingSteps,
    upgradeRequest,
    refetchKYC: fetchKYCStatus,
  };
}

/**
 * Hook to check if user can perform investor actions
 * Gates on KYC approval — wallet match is enforced at the blockchain operation level
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

  if (!compliance.isKYCApproved && !compliance.isVerifiedOnChain) {
    return {
      canAct: false,
      reason: compliance.missingSteps[0] || "Complete KYC verification",
      isLoading: false,
    };
  }

  return { canAct: true, reason: null, isLoading: false };
}

/**
 * Hook to check if user can perform rentor actions
 * Gates on KYC approval — wallet match is enforced at the blockchain operation level
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

  if (!compliance.isKYCApproved && !compliance.isVerifiedOnChain) {
    return {
      canAct: false,
      reason: compliance.missingSteps[0] || "Complete KYC verification",
      isLoading: false,
    };
  }

  return { canAct: true, reason: null, isLoading: false };
}

/**
 * Hook to check if user can perform renter actions
 * Gates on KYC approval — wallet match is enforced at the blockchain operation level
 */
export function useCanRenterAct(): {
  canAct: boolean;
  reason: string | null;
  isLoading: boolean;
} {
  const { user } = useUserStore();
  const compliance = useComplianceStatus();

  if (compliance.isLoading) {
    return { canAct: false, reason: null, isLoading: true };
  }

  if (user?.role !== "renter") {
    return {
      canAct: false,
      reason: "You must be registered as a renter",
      isLoading: false,
    };
  }

  if (!compliance.isKYCApproved && !compliance.isVerifiedOnChain) {
    return {
      canAct: false,
      reason: compliance.missingSteps[0] || "Complete KYC verification",
      isLoading: false,
    };
  }

  return { canAct: true, reason: null, isLoading: false };
}
