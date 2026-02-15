import apiClient from "./axios";
import { Vehicle } from "@/types";

export const vehicleApi = {
  // Get all vehicles (for browsing)
  getAll: async (): Promise<{ success: boolean; data: Vehicle[] }> => {
    const { data } = await apiClient.get("/user/cars");
    return data;
  },

  // Get single vehicle details
  getById: async (id: string): Promise<{ success: boolean; data: Vehicle }> => {
    const { data } = await apiClient.get(`/user/cars?id=${id}`);
    return data;
  },

  // Get rentor's vehicles
  getRentorVehicles: async (): Promise<{ success: boolean; data: Vehicle[] }> => {
    const { data } = await apiClient.get("/rentor/cars");
    // Backend returns { success, cars } — normalize to { success, data }
    return { success: data.success, data: data.cars || data.data || [] };
  },

  // Add new vehicle
  addVehicle: async (vehicleData: FormData): Promise<{ success: boolean; data: Vehicle }> => {
    const { data } = await apiClient.post("/rentor/add-car", vehicleData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },

  // Update vehicle
  updateVehicle: async (vehicleId: string, vehicleData: FormData): Promise<{ success: boolean; data: Vehicle }> => {
    const { data } = await apiClient.post(`/rentor/update-car/${vehicleId}`, vehicleData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return { success: data.success, data: data.car || data.data };
  },

  // Toggle vehicle availability
  toggleAvailability: async (
    vehicleId: string
  ): Promise<{ success: boolean; data: Vehicle }> => {
    const { data } = await apiClient.post("/rentor/toggle-car", { carId: vehicleId });
    return data;
  },

  // Delete vehicle
  deleteVehicle: async (vehicleId: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post("/rentor/delete-car", { carId: vehicleId });
    return data;
  },

  // Save on-chain vehicle NFT ID after minting
  setVehicleNftId: async (
    vehicleId: string,
    vehicleNftId: number,
    ownerAddress: string
  ): Promise<{ success: boolean; message: string; data: Vehicle }> => {
    const { data } = await apiClient.post(`/rentor/vehicle/${vehicleId}/set-nft-id`, {
      vehicleNftId,
      ownerAddress,
    });
    return data;
  },
};
