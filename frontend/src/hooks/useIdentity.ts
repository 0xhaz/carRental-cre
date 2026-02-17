/**
 * Identity & Claims Hooks
 * Hooks for reading identity claims from ClaimIssuer and IdentityRegistry contracts.
 */

import { useReadContract } from "wagmi";
import { useClaimIssuer, useIdentityRegistry } from "./useContracts";

/**
 * Get a user's OnchainID contract address from IdentityRegistry
 */
export function useUserIdentity(userAddress?: string) {
  const { address, abi } = useIdentityRegistry();

  return useReadContract({
    address,
    abi,
    functionName: "identity",
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}

/**
 * Check if a user is verified on-chain
 */
export function useIsUserVerified(userAddress?: string) {
  const { address, abi } = useIdentityRegistry();

  return useReadContract({
    address,
    abi,
    functionName: "isVerified",
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}

/**
 * Get all claim IDs for an identity (OnchainID address)
 */
export function useClaimsByIdentity(identityAddress?: string) {
  const { address, abi } = useClaimIssuer();

  return useReadContract({
    address,
    abi,
    functionName: "getClaimsByIdentity",
    args: identityAddress ? [identityAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!identityAddress,
    },
  });
}

/**
 * Get claim details by claim ID
 */
export function useClaimDetails(claimId?: string) {
  const { address, abi } = useClaimIssuer();

  return useReadContract({
    address,
    abi,
    functionName: "getClaim",
    args: claimId ? [claimId as `0x${string}`] : undefined,
    query: {
      enabled: !!claimId,
    },
  });
}

/**
 * Check if a claim is valid (not revoked and not expired)
 */
export function useClaimValidity(claimId?: string) {
  const { address, abi } = useClaimIssuer();

  return useReadContract({
    address,
    abi,
    functionName: "isClaimValid",
    args: claimId ? [claimId as `0x${string}`] : undefined,
    query: {
      enabled: !!claimId,
    },
  });
}

/**
 * Get the claim issuer's name
 */
export function useIssuerName() {
  const { address, abi } = useClaimIssuer();

  return useReadContract({
    address,
    abi,
    functionName: "issuerName",
  });
}

// Claim topic display names
export const CLAIM_TOPICS: Record<number, string> = {
  1: "Identity",
  2: "Residency",
  3: "Accreditation",
  4: "Country",
  5: "Document",
  6: "Financial",
  7: "KYC",
};

export function getClaimTopicName(topic: number): string {
  return CLAIM_TOPICS[topic] || `Topic #${topic}`;
}
