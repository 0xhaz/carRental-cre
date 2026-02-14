/**
 * Rental Operations Hooks
 * Hooks for interacting with RentalBooking, RentalPaymentProtocol,
 * and RentalOperations contracts.
 * All payments use native ETH (no ERC-20 tokens).
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRentalBooking, useRentalPaymentProtocol } from "./useContracts";
import { parseEther, formatEther } from "viem";

// ═══════════════════════════════════════════════
// Booking Queries (RentalBooking)
// ═══════════════════════════════════════════════

/**
 * Get booking details by ID
 */
export function useBookingDetails(bookingId?: bigint) {
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
  vehicleId?: bigint,
  startTime?: bigint,
  endTime?: bigint
) {
  const { address, abi } = useRentalBooking();

  return useReadContract({
    address,
    abi,
    functionName: "isVehicleAvailable",
    args: vehicleId !== undefined && startTime !== undefined && endTime !== undefined
      ? [vehicleId, startTime, endTime]
      : undefined,
    query: {
      enabled: vehicleId !== undefined && startTime !== undefined && endTime !== undefined,
    },
  });
}

/**
 * Calculate booking cost (startTime, endTime, ratePerDay) => totalCost
 */
export function useCalculateBookingCost(
  startTime?: bigint,
  endTime?: bigint,
  ratePerDay?: bigint
) {
  const { address, abi } = useRentalBooking();

  const result = useReadContract({
    address,
    abi,
    functionName: "calculateBookingCost",
    args: startTime !== undefined && endTime !== undefined && ratePerDay !== undefined
      ? [startTime, endTime, ratePerDay]
      : undefined,
    query: {
      enabled: startTime !== undefined && endTime !== undefined && ratePerDay !== undefined,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

// ═══════════════════════════════════════════════
// Renter Actions (RentalBooking)
// ═══════════════════════════════════════════════

/**
 * Request a booking (sends ETH: ratePerDay * days + securityDeposit)
 */
export function useRequestBooking() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const requestBooking = (
    vehicleId: bigint,
    startTime: bigint,
    endTime: bigint,
    ratePerDay: bigint,
    securityDeposit: bigint,
    totalValue: bigint,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "requestBooking",
      args: [vehicleId, startTime, endTime, ratePerDay, securityDeposit],
      value: totalValue,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { requestBooking, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Extend an active rental
 */
export function useExtendRental() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const extendRental = (bookingId: bigint, additionalDays: bigint, additionalPayment: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "extendRental",
      args: [bookingId, additionalDays],
      value: additionalPayment,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { extendRental, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Initiate return (renter signals they want to return the vehicle)
 */
export function useInitiateReturn() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const initiateReturn = (bookingId: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "initiateReturn",
      args: [bookingId],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { initiateReturn, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Report an issue with a rental
 */
export function useReportIssue() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const reportIssue = (bookingId: bigint, issue: string) => {
    writeContract({
      address,
      abi,
      functionName: "reportIssue",
      args: [bookingId, issue],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { reportIssue, hash, isConfirming, isSuccess, ...rest };
}

/**
 * Dispute charges on a booking
 */
export function useDisputeCharges() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const disputeCharges = (bookingId: bigint, disputedAmount: bigint, reason: string) => {
    writeContract({
      address,
      abi,
      functionName: "disputeCharges",
      args: [bookingId, disputedAmount, reason],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { disputeCharges, hash, isConfirming, isSuccess, ...rest };
}

// ═══════════════════════════════════════════════
// Rental Payment (RentalPaymentProtocol)
// ═══════════════════════════════════════════════

/**
 * Get rental payment details by payment ID
 */
export function useRentalPaymentDetails(paymentId?: bigint) {
  const { address, abi } = useRentalPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "getRentalPayment",
    args: paymentId !== undefined ? [paymentId] : undefined,
    query: {
      enabled: paymentId !== undefined,
    },
  });
}

/**
 * Get all rental payment IDs for a vehicle
 */
export function useVehicleRentalPayments(vehicleId?: bigint) {
  const { address, abi } = useRentalPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "getVehicleRentalPayments",
    args: vehicleId !== undefined ? [vehicleId] : undefined,
    query: {
      enabled: vehicleId !== undefined,
    },
  });
}

/**
 * Get platform fee rate (basis points, e.g. 500 = 5%)
 */
export function usePlatformFeeRate() {
  const { address, abi } = useRentalPaymentProtocol();

  return useReadContract({
    address,
    abi,
    functionName: "platformFeeRate",
  });
}

/**
 * Create a rental booking payment (sends ETH: rentalFee + securityDeposit + escrowFee)
 */
export function useCreateRentalBookingPayment() {
  const { address, abi } = useRentalPaymentProtocol();
  const { data: hash, writeContract, isSuccess: _ws, ...rest } = useWriteContract();

  const createPayment = (
    bookingId: bigint,
    vehicleId: bigint,
    rentor: `0x${string}`,
    rentalFee: bigint,
    securityDeposit: bigint,
    startTime: bigint,
    endTime: bigint,
    totalValue: bigint,
  ) => {
    writeContract({
      address,
      abi,
      functionName: "createRentalBooking",
      args: [bookingId, vehicleId, rentor, rentalFee, securityDeposit, startTime, endTime],
      value: totalValue,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { createPayment, hash, isConfirming, isSuccess, ...rest };
}
