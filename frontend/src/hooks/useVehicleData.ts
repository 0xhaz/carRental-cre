/**
 * Vehicle Data Hooks
 * Hooks for reading vehicle NFT data from the blockchain.
 * Matches the refactored VehicleNFT contract interface.
 */

import { useAccount, useReadContract } from "wagmi";
import { useVehicleNFT } from "./useContracts";

/**
 * Get vehicle metadata by token ID
 * Returns: VehicleMetadata { vin, make, model, year, color, mileage, registrationExpiry, insuranceExpiry }
 */
export function useVehicleMetadata(tokenId?: bigint) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleMetadata",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get full vehicle info (metadata + status + booking + counts)
 * Returns: (metadata, status, currentBooking, maintenanceCount, incidentCount)
 */
export function useVehicleInfo(tokenId?: bigint) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleInfo",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get vehicle owner
 */
export function useVehicleOwner(tokenId?: bigint) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "ownerOf",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get linked AssetToken and RevenueToken for a vehicle
 * Returns: (assetToken address, revenueToken address)
 */
export function useLinkedTokens(tokenId?: bigint) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getLinkedTokens",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Check if a VIN is already registered
 */
export function useIsVINRegistered(vin?: string) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "isVINRegistered",
    args: vin ? [vin] : undefined,
    query: {
      enabled: !!vin,
    },
  });
}

/**
 * Get token ID by VIN
 */
export function useTokenIdByVIN(vin?: string) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getTokenIdByVIN",
    args: vin ? [vin] : undefined,
    query: {
      enabled: !!vin,
    },
  });
}

/**
 * Get number of vehicles owned by an address (ERC-721 balanceOf)
 */
export function useUserVehicleCount(userAddress?: `0x${string}`) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}

/**
 * Get my vehicle count
 */
export function useMyVehicleCount() {
  const { address: userAddress } = useAccount();
  return useUserVehicleCount(userAddress);
}

// Backward-compatible aliases
export const useVehicleDetails = useVehicleInfo;
export const useTotalVehicles = useMyVehicleCount;
