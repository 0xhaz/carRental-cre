/**
 * Vehicle Data Hooks
 * Hooks for reading vehicle NFT data from the blockchain
 */

import { useReadContract, useReadContracts } from "wagmi";
import { useVehicleNFT } from "./useContracts";

/**
 * Get total number of vehicles minted
 */
export function useTotalVehicles() {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "totalSupply",
  });
}

/**
 * Get vehicle details by token ID
 */
export function useVehicleDetails(tokenId: bigint | undefined) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleDetails",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get vehicle owner
 */
export function useVehicleOwner(tokenId: bigint | undefined) {
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
 * Check if vehicle is available for rent
 */
export function useVehicleAvailability(tokenId: bigint | undefined) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "isAvailableForRent",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get all vehicles owned by an address
 */
export function useUserVehicles(userAddress: `0x${string}` | undefined) {
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
 * Get vehicle rental price per day
 */
export function useVehicleRentalPrice(tokenId: bigint | undefined) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getRentalPricePerDay",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}
