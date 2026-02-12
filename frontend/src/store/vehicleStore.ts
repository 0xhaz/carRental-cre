import { create } from "zustand";
import type { Vehicle, VehicleStatus } from "@/src/types";
import { vehicleApi } from "@/src/lib/api";
import { toast } from "react-hot-toast";

interface VehicleFilters {
  search?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: VehicleStatus;
  fuelType?: string;
  transmission?: string;
}

interface VehicleState {
  // State
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  filters: VehicleFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  setVehicles: (vehicles: Vehicle[]) => void;
  fetchVehicles: () => Promise<void>;
  fetchVehicleById: (id: string) => Promise<void>;
  fetchRentorVehicles: () => Promise<void>;
  addVehicle: (vehicleData: FormData) => Promise<void>;
  toggleAvailability: (id: string) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setFilters: (filters: Partial<VehicleFilters>) => void;
  resetFilters: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getFilteredVehicles: () => Vehicle[];
  getVehicleById: (id: string) => Vehicle | undefined;
  getAvailableVehicles: () => Vehicle[];
}

const initialFilters: VehicleFilters = {
  search: "",
  category: "",
  location: "",
  minPrice: undefined,
  maxPrice: undefined,
  status: undefined,
  fuelType: "",
  transmission: "",
};

export const useVehicleStore = create<VehicleState>((set, get) => ({
  // Initial State
  vehicles: [],
  selectedVehicle: null,
  filters: initialFilters,
  isLoading: false,
  error: null,

  // Actions
  setVehicles: (vehicles) => set({ vehicles, error: null }),

  fetchVehicles: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await vehicleApi.getAll();
      set({ vehicles: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
    }
  },

  fetchVehicleById: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const response = await vehicleApi.getById(id);
      set({ selectedVehicle: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
    }
  },

  fetchRentorVehicles: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await vehicleApi.getRentorVehicles();
      set({ vehicles: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
    }
  },

  addVehicle: async (vehicleData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await vehicleApi.addVehicle(vehicleData);
      set((state) => ({
        vehicles: [...state.vehicles, response.data],
        isLoading: false,
      }));
      toast.success("Vehicle added successfully!");
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  toggleAvailability: async (id) => {
    try {
      const response = await vehicleApi.toggleAvailability(id);
      set((state) => ({
        vehicles: state.vehicles.map((v) =>
          v._id === id ? response.data : v
        ),
        selectedVehicle:
          state.selectedVehicle?._id === id
            ? response.data
            : state.selectedVehicle,
      }));
      toast.success("Vehicle availability updated!");
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  removeVehicle: async (id) => {
    try {
      await vehicleApi.deleteVehicle(id);
      set((state) => ({
        vehicles: state.vehicles.filter((v) => v._id !== id),
        selectedVehicle:
          state.selectedVehicle?._id === id ? null : state.selectedVehicle,
      }));
      toast.success("Vehicle deleted successfully!");
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  resetFilters: () => set({ filters: initialFilters }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Computed
  getFilteredVehicles: () => {
    const { vehicles, filters } = get();

    return vehicles.filter((vehicle) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          vehicle.brand.toLowerCase().includes(searchLower) ||
          vehicle.model.toLowerCase().includes(searchLower) ||
          vehicle.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && vehicle.category !== filters.category) {
        return false;
      }

      // Location filter
      if (filters.location && vehicle.location !== filters.location) {
        return false;
      }

      // Price filters
      if (filters.minPrice && vehicle.pricePerDay < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice && vehicle.pricePerDay > filters.maxPrice) {
        return false;
      }

      // Status filter
      if (filters.status && vehicle.status !== filters.status) {
        return false;
      }

      // Fuel type filter
      if (filters.fuelType && vehicle.fuel_type !== filters.fuelType) {
        return false;
      }

      // Transmission filter
      if (
        filters.transmission &&
        vehicle.transmission !== filters.transmission
      ) {
        return false;
      }

      return true;
    });
  },

  getVehicleById: (id) => {
    return get().vehicles.find((v) => v._id === id);
  },

  getAvailableVehicles: () => {
    return get().vehicles.filter((v) => v.isAvailable);
  },
}));
