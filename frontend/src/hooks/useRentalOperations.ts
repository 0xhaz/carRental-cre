/**
 * Rental Operations Hooks
 * Hooks for interacting with the rental booking system
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRentalBooking, useRentalPaymentProtocol } from "./useContracts";
import { parseUnits } from "viem";

/**
 * Get active bookings for a user
 */
export function useUserBookings(userAddress?: `0x${string}`) {
  const { address, abi } = useRentalBooking();

  return useReadContract({
    address,
    abi,
    functionName: "getUserBookings",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}

/**
 * Get my active bookings
 */
export function useMyBookings() {
  const { address: userAddress } = useAccount();
  return useUserBookings(userAddress);
}

/**
 * Get booking details by ID
 */
export function useBookingDetails(bookingId: bigint | undefined) {
  const { address, abi } = useRentalBooking();

  return useReadContract({
    address,
    abi,
    functionName: "getBooking",
    args: bookingId !== undefined ? [bookingId] : undefined,
    query: {
      enabled: bookingId !== undefined,
    },
  });
}

/**
 * Check if a vehicle is available for specific dates
 */
export function useCheckVehicleAvailability(
  vehicleId: bigint | undefined,
  startDate: bigint | undefined,
  endDate: bigint | undefined
) {
  const { address, abi } = useRentalBooking();

  return useReadContract({
    address,
    abi,
    functionName: "isVehicleAvailable",
    args: vehicleId !== undefined && startDate !== undefined && endDate !== undefined
      ? [vehicleId, startDate, endDate]
      : undefined,
    query: {
      enabled: vehicleId !== undefined && startDate !== undefined && endDate !== undefined,
    },
  });
}

/**
 * Calculate rental cost
 */
export function useCalculateRentalCost(
  vehicleId: bigint | undefined,
  startDate: bigint | undefined,
  endDate: bigint | undefined
) {
  const { address, abi } = useRentalBooking();

  return useReadContract({
    address,
    abi,
    functionName: "calculateRentalCost",
    args: vehicleId !== undefined && startDate !== undefined && endDate !== undefined
      ? [vehicleId, startDate, endDate]
      : undefined,
    query: {
      enabled: vehicleId !== undefined && startDate !== undefined && endDate !== undefined,
    },
  });
}

/**
 * Create a rental booking
 */
export function useCreateBooking() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract, ...rest } = useWriteContract();

  const createBooking = (vehicleId: bigint, startDate: bigint, endDate: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "createBooking",
      args: [vehicleId, startDate, endDate],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    createBooking,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

/**
 * Cancel a booking
 */
export function useCancelBooking() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract, ...rest } = useWriteContract();

  const cancelBooking = (bookingId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "cancelBooking",
      args: [bookingId],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    cancelBooking,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

/**
 * Complete a rental (mark as returned)
 */
export function useCompleteRental() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract, ...rest } = useWriteContract();

  const completeRental = (bookingId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "completeRental",
      args: [bookingId],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    completeRental,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

/**
 * Start a rental (pickup vehicle)
 */
export function useStartRental() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract, ...rest } = useWriteContract();

  const startRental = (bookingId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "startRental",
      args: [bookingId],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    startRental,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}
