import apiClient from "./axios";
import { Vehicle, MilestoneDocument } from "@/types";

export const vehicleApi = {
  // Get all vehicles (for browsing)
  getAll: async (): Promise<{ success: boolean; data: Vehicle[] }> => {
    const { data } = await apiClient.get("/user/cars");
    return { success: data.success, data: data.cars || data.data || [] };
  },

  // Get single vehicle details
  getById: async (id: string): Promise<{ success: boolean; data: Vehicle }> => {
    const { data } = await apiClient.get(`/user/cars/${id}`);
    return { success: data.success, data: data.car || data.data };
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

  // Save deployed token addresses after on-chain deployment
  setVehicleTokens: async (
    vehicleId: string,
    assetTokenAddress: string,
    revenueTokenAddress: string
  ): Promise<{ success: boolean; message: string; data: Vehicle }> => {
    const { data } = await apiClient.post(`/rentor/vehicle/${vehicleId}/set-tokens`, {
      assetTokenAddress,
      revenueTokenAddress,
    });
    return data;
  },

  // Get vehicles with tokens deployed that need admin registration
  getVehiclesPendingRegistration: async (): Promise<{ success: boolean; data: Vehicle[] }> => {
    const { data } = await apiClient.get("/rentor/vehicles-pending-registration");
    return data;
  },

  // Mark token registration as complete (notifies the rentor)
  // Also syncs on-chain token addresses to DB to prevent address mismatch
  completeTokenRegistration: async (
    vehicleId: string,
    assetTokenAddress?: string,
    revenueTokenAddress?: string
  ): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post(`/rentor/vehicle/${vehicleId}/complete-registration`, {
      assetTokenAddress,
      revenueTokenAddress,
    });
    return data;
  },

  // Sync vehicle token addresses from on-chain state to DB
  syncTokenAddresses: async (
    vehicleId: string,
    assetTokenAddress: string,
    revenueTokenAddress: string
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post(`/rentor/vehicle/${vehicleId}/sync-token-addresses`, {
      assetTokenAddress,
      revenueTokenAddress,
    });
    return data;
  },

  // Upload milestone documents for a vehicle
  uploadMilestoneDocuments: async (
    vehicleId: string,
    formData: FormData
  ): Promise<{ success: boolean; data: MilestoneDocument[] }> => {
    const { data } = await apiClient.post(
      `/rentor/vehicle/${vehicleId}/milestone-documents`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },

  // Look up a vehicle by on-chain NFT ID
  getByNftId: async (nftId: number): Promise<{ success: boolean; data: Vehicle }> => {
    const { data } = await apiClient.get(`/rentor/vehicle-by-nft/${nftId}`);
    return data;
  },

  // Get milestone documents for a vehicle
  getMilestoneDocuments: async (
    vehicleId: string
  ): Promise<{ success: boolean; data: MilestoneDocument[] }> => {
    const { data } = await apiClient.get(`/rentor/vehicle/${vehicleId}/milestone-documents`);
    return data;
  },
};
