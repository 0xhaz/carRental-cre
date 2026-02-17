import apiClient from "./axios";
import { Booking } from "@/types";

export interface CreateBookingData {
  carId: string;
  pickupDate: string;
  returnDate: string;
  price: number;
  securityDeposit: number;
}

export const bookingApi = {
  // Get a single booking by ID
  getById: async (bookingId: string): Promise<{ success: boolean; data: Booking }> => {
    const { data } = await apiClient.get(`/bookings/${bookingId}`);
    // Backend returns { success, booking } — normalize to { success, data }
    return { success: data.success, data: data.booking || data.data };
  },

  // Create new booking
  create: async (bookingData: CreateBookingData): Promise<{ success: boolean; data: Booking }> => {
    const { data } = await apiClient.post("/bookings/create", bookingData);
    return data;
  },

  // Get user's bookings (renter)
  getUserBookings: async (): Promise<{ success: boolean; data: Booking[] }> => {
    const { data } = await apiClient.get("/bookings/user");
    // Backend returns { success, bookings } — normalize to { success, data }
    return { success: data.success, data: data.bookings || data.data || [] };
  },

  // Get rentor's bookings
  getRentorBookings: async (): Promise<{ success: boolean; data: Booking[] }> => {
    const { data } = await apiClient.get("/bookings/rentor");
    // Backend returns { success, bookings } — normalize to { success, data }
    return { success: data.success, data: data.bookings || data.data || [] };
  },

  // Check vehicle availability
  checkAvailability: async (params: {
    carId: string;
    pickupDate: string;
    returnDate: string;
  }): Promise<{ success: boolean; available: boolean }> => {
    const { data } = await apiClient.post("/bookings/check-availability", params);
    return data;
  },

  // Change booking status
  changeStatus: async (
    bookingId: string,
    status: string
  ): Promise<{ success: boolean; data: Booking }> => {
    const { data } = await apiClient.post("/bookings/change-status", {
      bookingId,
      status,
    });
    return data;
  },

  // Update booking with on-chain payment data
  updateOnChainStatus: async (
    bookingId: string,
    txHash: string
  ): Promise<{ success: boolean; data: Booking }> => {
    const { data } = await apiClient.patch(`/bookings/${bookingId}/onchain`, {
      txHash,
    });
    return data;
  },
};
