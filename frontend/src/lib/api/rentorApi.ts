import apiClient from "./axios";
import { Vehicle, FundraisingCampaign, Investment } from "@/types";

export interface RentorDashboardData {
  totalCars: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  recentBookings: Array<{
    _id: string;
    car: {
      brand: string;
      model: string;
      year: number;
      image: string;
    };
    user: {
      name: string;
      email: string;
    };
    pickupDate: Date;
    returnDate: Date;
    price: number;
    status: string;
    createdAt: Date;
  }>;
  monthlyRevenue: number;
}

export const rentorApi = {
  // Get rentor dashboard data
  getDashboard: async (): Promise<{ success: boolean; dashboardData: RentorDashboardData }> => {
    const { data } = await apiClient.get("/rentor/dashboard");
    return data;
  },

  // Change user role to rentor
  changeRoleToRentor: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post("/rentor/change-role");
    return data;
  },

  // Get single vehicle with campaign and investment data
  getVehicleById: async (vehicleId: string): Promise<{
    success: boolean;
    data: { vehicle: Vehicle; campaign: FundraisingCampaign | null; investments: Investment[] };
  }> => {
    const { data } = await apiClient.get(`/rentor/vehicle/${vehicleId}`);
    return data;
  },

  // Update user profile image
  updateProfileImage: async (formData: FormData): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post("/rentor/update-user-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },
};
