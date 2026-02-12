import apiClient from "./axios";
import { Review, ReviewFormData } from "@/src/types";

export const reviewApi = {
  // Create review
  create: async (
    bookingId: string,
    vehicleId: string,
    reviewData: ReviewFormData
  ): Promise<{ success: boolean; data: Review }> => {
    const { data } = await apiClient.post("/reviews/create", {
      bookingId,
      vehicleId,
      ...reviewData,
    });
    return data;
  },

  // Get reviews for a vehicle
  getByVehicle: async (vehicleId: string): Promise<{ success: boolean; data: Review[] }> => {
    const { data } = await apiClient.get(`/reviews/vehicle/${vehicleId}`);
    return data;
  },

  // Get user's reviews
  getUserReviews: async (): Promise<{ success: boolean; data: Review[] }> => {
    const { data } = await apiClient.get("/reviews/user");
    return data;
  },

  // Respond to review (rentor)
  respond: async (
    reviewId: string,
    response: string
  ): Promise<{ success: boolean; data: Review }> => {
    const { data } = await apiClient.post(`/reviews/respond/${reviewId}`, { response });
    return data;
  },

  // Check if user can review a booking
  canReview: async (
    bookingId: string
  ): Promise<{ success: boolean; data: { canReview: boolean; reason: string | null } }> => {
    const { data } = await apiClient.get(`/reviews/can-review/${bookingId}`);
    return data;
  },
};
