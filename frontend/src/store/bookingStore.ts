import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Booking, BookingStatus } from "@/src/types";
import { bookingApi } from "@/src/lib/api";
import { toast } from "react-hot-toast";

interface BookingFlowState {
  // Booking Flow State (temporary during booking process)
  pickupDate: string;
  returnDate: string;
  pickupLocation: string;
  returnLocation: string;
  selectedVehicleId: string | null;

  // Booking Actions
  setPickupDate: (date: string) => void;
  setReturnDate: (date: string) => void;
  setPickupLocation: (location: string) => void;
  setReturnLocation: (location: string) => void;
  setSelectedVehicleId: (id: string | null) => void;
  resetBookingFlow: () => void;

  // Computed
  getBookingDays: () => number;
  isBookingFlowValid: () => boolean;
}

interface BookingDataState {
  // Bookings Data
  bookings: Booking[];
  selectedBooking: Booking | null;
  isLoading: boolean;
  error: string | null;

  // Booking Data Actions
  setBookings: (bookings: Booking[]) => void;
  fetchUserBookings: () => Promise<void>;
  fetchRentorBookings: () => Promise<void>;
  createBooking: (bookingData: {
    carId: string;
    pickupDate: string;
    returnDate: string;
    price: number;
    securityDeposit: number;
  }) => Promise<void>;
  updateBookingStatus: (id: string, status: string) => Promise<void>;
  checkAvailability: (params: {
    carId: string;
    pickupDate: string;
    returnDate: string;
  }) => Promise<boolean>;
  setSelectedBooking: (booking: Booking | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getBookingById: (id: string) => Booking | undefined;
  getUserBookings: (userId: string) => Booking[];
  getPendingBookings: () => Booking[];
  getActiveBookings: () => Booking[];
  getCompletedBookings: () => Booking[];
}

// Booking Flow Store (session storage - temporary)
export const useBookingFlowStore = create<BookingFlowState>()(
  persist(
    (set, get) => ({
      // Initial State
      pickupDate: "",
      returnDate: "",
      pickupLocation: "",
      returnLocation: "",
      selectedVehicleId: null,

      // Actions
      setPickupDate: (date) => set({ pickupDate: date }),

      setReturnDate: (date) => set({ returnDate: date }),

      setPickupLocation: (location) => set({ pickupLocation: location }),

      setReturnLocation: (location) => set({ returnLocation: location }),

      setSelectedVehicleId: (id) => set({ selectedVehicleId: id }),

      resetBookingFlow: () =>
        set({
          pickupDate: "",
          returnDate: "",
          pickupLocation: "",
          returnLocation: "",
          selectedVehicleId: null,
        }),

      // Computed
      getBookingDays: () => {
        const { pickupDate, returnDate } = get();
        if (!pickupDate || !returnDate) return 0;

        const pickup = new Date(pickupDate);
        const returnD = new Date(returnDate);
        const diff = returnD.getTime() - pickup.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
      },

      isBookingFlowValid: () => {
        const { pickupDate, returnDate, pickupLocation, selectedVehicleId } = get();
        return !!(pickupDate && returnDate && pickupLocation && selectedVehicleId);
      },
    }),
    {
      name: "regshield-booking-flow",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

// Booking Data Store (memory - will be populated from API)
export const useBookingStore = create<BookingDataState>((set, get) => ({
  // Initial State
  bookings: [],
  selectedBooking: null,
  isLoading: false,
  error: null,

  // Actions
  setBookings: (bookings) => set({ bookings, error: null }),

  fetchUserBookings: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await bookingApi.getUserBookings();
      set({ bookings: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
    }
  },

  fetchRentorBookings: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await bookingApi.getRentorBookings();
      set({ bookings: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
    }
  },

  createBooking: async (bookingData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await bookingApi.create(bookingData);
      set((state) => ({
        bookings: [...state.bookings, response.data],
        isLoading: false,
      }));
      toast.success("Booking created successfully!");
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  updateBookingStatus: async (id, status) => {
    try {
      const response = await bookingApi.changeStatus(id, status);
      set((state) => ({
        bookings: state.bookings.map((b) =>
          b._id === id ? response.data : b
        ),
        selectedBooking:
          state.selectedBooking?._id === id
            ? response.data
            : state.selectedBooking,
      }));
      toast.success("Booking status updated!");
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  checkAvailability: async (params) => {
    try {
      const response = await bookingApi.checkAvailability(params);
      return response.available;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  setSelectedBooking: (booking) => set({ selectedBooking: booking }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Computed
  getBookingById: (id) => {
    return get().bookings.find((b) => b._id === id);
  },

  getUserBookings: (userId) => {
    return get().bookings.filter((b) => b.user === userId);
  },

  getPendingBookings: () => {
    return get().bookings.filter((b) => b.status === "pending");
  },

  getActiveBookings: () => {
    return get().bookings.filter((b) => b.status === "active" || b.status === "confirmed");
  },

  getCompletedBookings: () => {
    return get().bookings.filter((b) => b.status === "completed");
  },
}));
