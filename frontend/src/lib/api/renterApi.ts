import apiClient from "./axios";
import { RenterDetails } from "@/components/renter/RenterDetailsForm";
import { PaymentDetails } from "@/components/renter/PaymentMethodSelector";

export interface RenterProfile {
  _id: string;
  user: string;
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  driverLicense: {
    number: string;
    expiryDate: Date;
    issuingState: string;
    frontImage?: {
      filename: string;
      url: string;
      uploadedAt: Date;
    };
    backImage?: {
      filename: string;
      url: string;
      uploadedAt: Date;
    };
    isVerified: boolean;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    expiryDate: Date;
    isVerified: boolean;
  };
  age: number;
  meetsAgeRequirement: boolean;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  preferredPaymentMethod?: "offline" | "bank_transfer" | "crypto";
}

export interface BookingSubmission {
  vehicleId: string;
  dates: {
    pickupDate: string;
    returnDate: string;
    days: number;
  };
  renterDetails: RenterDetails;
  bookingDetails: {
    pickupLocation: string;
    additionalDriver: boolean;
    insuranceUpgrade: boolean;
  };
  payment: PaymentDetails;
  pricing: {
    basePrice: number;
    insuranceCost: number;
    additionalDriverCost: number;
    insuranceUpgradeCost: number;
    totalPrice: number;
  };
}

export interface RenterBooking {
  _id: string;
  car: {
    _id: string;
    brand: string;
    model: string;
    year: number;
    image: string;
    pricePerDay: number;
  };
  user: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  renterProfile: string | RenterProfile;
  pickupDate: Date;
  returnDate: Date;
  pickupLocation: string;
  days: number;
  price: number;
  pricing: {
    basePrice: number;
    insuranceCost: number;
    additionalDriverCost: number;
    insuranceUpgradeCost: number;
    totalPrice: number;
  };
  addons: {
    additionalDriver: boolean;
    insuranceUpgrade: boolean;
  };
  paymentMethod: "offline" | "bank_transfer" | "crypto";
  paymentStatus: "pending" | "paid" | "refunded" | "failed";
  status: "pending" | "confirmed" | "active" | "completed" | "cancelled" | "disputed";
  createdAt: Date;
  updatedAt: Date;
}

export const renterApi = {
  // Create or update renter profile
  createOrUpdateProfile: async (
    profileData: Partial<RenterDetails>,
    files?: {
      licenseFront?: File;
      licenseBack?: File;
    }
  ): Promise<{ success: boolean; message: string; profile: RenterProfile }> => {
    const formData = new FormData();

    // Add profile data
    if (profileData.fullName) formData.append("fullName", profileData.fullName);
    if (profileData.email) formData.append("email", profileData.email);
    if (profileData.phone) formData.append("phone", profileData.phone);
    if (profileData.dateOfBirth) formData.append("dateOfBirth", profileData.dateOfBirth);
    if (profileData.address) formData.append("address", profileData.address);
    if (profileData.city) formData.append("city", profileData.city);
    if (profileData.state) formData.append("state", profileData.state);
    if (profileData.zipCode) formData.append("zipCode", profileData.zipCode);

    // Add driver's license data
    if (profileData.driverLicense) {
      formData.append("driverLicense", JSON.stringify(profileData.driverLicense));
    }

    // Add files
    if (files?.licenseFront) {
      formData.append("licenseFront", files.licenseFront);
    }
    if (files?.licenseBack) {
      formData.append("licenseBack", files.licenseBack);
    }

    const { data } = await apiClient.post("/renter/profile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },

  // Get renter profile
  getProfile: async (): Promise<{ success: boolean; profile: RenterProfile }> => {
    const { data } = await apiClient.get("/renter/profile");
    return data;
  },

  // Submit booking
  submitBooking: async (
    bookingData: BookingSubmission
  ): Promise<{ success: boolean; message: string; booking: RenterBooking }> => {
    const { data } = await apiClient.post("/renter/booking", bookingData);
    return data;
  },

  // Get renter's bookings
  getBookings: async (params?: {
    status?: "pending" | "confirmed" | "active" | "completed" | "cancelled" | "disputed";
  }): Promise<{ success: boolean; count: number; bookings: RenterBooking[] }> => {
    const { data } = await apiClient.get("/renter/bookings", { params });
    return data;
  },

  // Get single booking
  getBookingById: async (bookingId: string): Promise<{ success: boolean; booking: RenterBooking }> => {
    const { data } = await apiClient.get(`/renter/booking/${bookingId}`);
    return data;
  },

  // Cancel booking
  cancelBooking: async (
    bookingId: string
  ): Promise<{ success: boolean; message: string; booking: RenterBooking }> => {
    const { data } = await apiClient.put(`/renter/booking/${bookingId}/cancel`);
    return data;
  },
};
