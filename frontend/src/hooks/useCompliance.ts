/**
 * Compliance Hooks
 * Hooks for reading RenterCompliance and OperationalCompliance contract state.
 */

import { useReadContract } from "wagmi";
import {
  useRenterComplianceContract,
  useOperationalComplianceContract,
} from "./useContracts";

// ═══════════════════════════════════════════════
// RenterCompliance Hooks
// ═══════════════════════════════════════════════

/**
 * Validate a renter address against compliance rules.
 * Returns the full RenterValidationResult struct.
 */
export function useValidateRenter(renterAddress?: `0x${string}`) {
  const { address, abi } = useRenterComplianceContract();

  return useReadContract({
    address,
    abi,
    functionName: "validateRenter",
    args: renterAddress ? [renterAddress] : undefined,
    query: {
      enabled: !!renterAddress,
    },
  });
}

/**
 * Check if a renter is blacklisted
 */
export function useIsRenterBlacklisted(renterAddress?: `0x${string}`) {
  const { address, abi } = useRenterComplianceContract();

  return useReadContract({
    address,
    abi,
    functionName: "isBlacklisted",
    args: renterAddress ? [renterAddress] : undefined,
    query: {
      enabled: !!renterAddress,
    },
  });
}

/**
 * Get renter incident count
 */
export function useRenterIncidentCount(renterAddress?: `0x${string}`) {
  const { address, abi } = useRenterComplianceContract();

  return useReadContract({
    address,
    abi,
    functionName: "getIncidentCount",
    args: renterAddress ? [renterAddress] : undefined,
    query: {
      enabled: !!renterAddress,
    },
  });
}

/**
 * Get current renter requirements
 */
export function useRenterRequirements() {
  const { address, abi } = useRenterComplianceContract();

  return useReadContract({
    address,
    abi,
    functionName: "getRequirements",
  });
}

// ═══════════════════════════════════════════════
// OperationalCompliance Hooks
// ═══════════════════════════════════════════════

/**
 * Validate a vehicle against operational compliance rules.
 * Returns the full OperationalValidationResult struct.
 */
export function useValidateVehicle(vehicleId?: bigint) {
  const { address, abi } = useOperationalComplianceContract();

  return useReadContract({
    address,
    abi,
    functionName: "validateVehicle",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}

/**
 * Check if a vehicle is operational
 */
export function useIsVehicleOperational(vehicleId?: bigint) {
  const { address, abi } = useOperationalComplianceContract();

  return useReadContract({
    address,
    abi,
    functionName: "isVehicleOperational",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}

/**
 * Get vehicle operational data (registration, insurance, maintenance dates, status)
 */
export function useVehicleOperationalData(vehicleId?: bigint) {
  const { address, abi } = useOperationalComplianceContract();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleData",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}
