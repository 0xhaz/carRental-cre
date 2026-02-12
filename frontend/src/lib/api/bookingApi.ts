import apiClient from "./axios";
import { Booking } from "@/src/types";

export interface CreateBookingData {
  carId: string;
  pickupDate: string;
  returnDate: string;
  price: number;
  securityDeposit: number;
}

export const bookingApi = {
  // Create new booking
  create: async (bookingData: CreateBookingData): Promise<{ success: boolean; data: Booking }> => {
    const { data } = await apiClient.post("/bookings/create", bookingData);
    return data;
  },

  // Get user's bookings (renter)
  getUserBookings: async (): Promise<{ success: boolean; data: Booking[] }> => {
    const { data } = await apiClient.get("/bookings/user");
    return data;
  },

  // Get rentor's bookings
  getRentorBookings: async (): Promise<{ success: boolean; data: Booking[] }> => {
    const { data } = await apiClient.get("/bookings/rentor");
    return data;
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
};
