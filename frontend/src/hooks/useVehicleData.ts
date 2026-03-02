/**
 * Vehicle Data Hooks
 * Hooks for reading vehicle NFT data from the blockchain.
 * Matches the refactored VehicleNFT contract interface.
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useVehicleNFT } from "./useContracts";
import { parseGwei } from "viem";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

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

// ═══════════════════════════════════════════════
// Vehicle History Hooks
// ═══════════════════════════════════════════════

/**
 * Get maintenance history for a vehicle
 * Returns: MaintenanceRecord[] { description, cost, timestamp }
 */
export function useMaintenanceHistory(tokenId?: bigint) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getMaintenanceHistory",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get incident history for a vehicle
 * Returns: IncidentRecord[] { description, estimatedCost, actualCost, bookingId, resolved, timestamp }
 */
export function useIncidentHistory(tokenId?: bigint) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getIncidentHistory",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get the active booking ID for a vehicle
 */
export function useCurrentBooking(tokenId?: bigint) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getCurrentBooking",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Get on-chain vehicle status enum
 */
export function useOnChainVehicleStatus(tokenId?: bigint) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleStatus",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

// Display labels for VehicleStatus enum
export const VEHICLE_STATUS_LABELS: Record<number, string> = {
  0: "Available",
  1: "Rented",
  2: "Maintenance",
  3: "Inactive",
  4: "Decommissioned",
};

// Backward-compatible aliases
export const useVehicleDetails = useVehicleInfo;
export const useTotalVehicles = useMyVehicleCount;

// ═══════════════════════════════════════════════
// Vehicle Existence Check
// ═══════════════════════════════════════════════

/**
 * Check if a vehicle token exists
 */
export function useVehicleExists(tokenId?: bigint) {
  const { address, abi } = useVehicleNFT();

  return useReadContract({
    address,
    abi,
    functionName: "vehicleExists",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });
}

// ═══════════════════════════════════════════════
// Vehicle NFT Operator Writes
// ═══════════════════════════════════════════════

/**
 * Mint a new vehicle NFT (operator only)
 */
export function useMintVehicle() {
  const { address, abi } = useVehicleNFT();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const mintVehicle = (
    to: `0x${string}`,
    metadata: {
      vin: string;
      make: string;
      model: string;
      year: bigint;
      color: string;
      mileage: bigint;
      registrationExpiry: bigint;
      insuranceExpiry: bigint;
    },
    assetToken: `0x${string}`,
    revenueToken: `0x${string}`,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "mintVehicle",
      args: [to, metadata, assetToken, revenueToken],
      gas: BigInt(1_000_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { mintVehicle, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Link token contracts to a vehicle (operator only)
 */
export function useLinkTokens() {
  const { address, abi } = useVehicleNFT();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const linkTokens = (
    tokenId: bigint,
    assetToken: `0x${string}`,
    revenueToken: `0x${string}`,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "linkTokens",
      args: [tokenId, assetToken, revenueToken],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { linkTokens, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Update vehicle mileage (operator only)
 */
export function useUpdateMileage() {
  const { address, abi } = useVehicleNFT();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const updateMileage = (tokenId: bigint, newMileage: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "updateMileage",
      args: [tokenId, newMileage],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { updateMileage, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Record a maintenance event (operator only)
 */
export function useRecordMaintenance() {
  const { address, abi } = useVehicleNFT();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const recordMaintenance = (tokenId: bigint, description: string, cost: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "recordMaintenance",
      args: [tokenId, description, cost],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { recordMaintenance, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Record an incident (operator only)
 */
export function useRecordIncident() {
  const { address, abi } = useVehicleNFT();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const recordIncident = (
    tokenId: bigint,
    description: string,
    estimatedCost: bigint,
    bookingId: bigint,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "recordIncident",
      args: [tokenId, description, estimatedCost, bookingId],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { recordIncident, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Resolve an incident (operator only)
 */
export function useResolveIncident() {
  const { address, abi } = useVehicleNFT();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const resolveIncident = (tokenId: bigint, incidentId: bigint, actualCost: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "resolveIncident",
      args: [tokenId, incidentId, actualCost],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { resolveIncident, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Update a metadata field (operator only)
 */
export function useUpdateMetadataField() {
  const { address, abi } = useVehicleNFT();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const updateField = (tokenId: bigint, field: string, value: string) => {
    writeContract({
      address,
      abi,
      functionName: "updateMetadataField",
      args: [tokenId, field, value],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { updateField, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Set operator status (owner only)
 */
export function useSetVehicleNFTOperator() {
  const { address, abi } = useVehicleNFT();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const setOperator = (operator: `0x${string}`, authorized: boolean) => {
    writeContract({
      address,
      abi,
      functionName: "setOperator",
      args: [operator, authorized],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { setOperator, hash, isConfirming, isSuccess, isPending, error };
}
