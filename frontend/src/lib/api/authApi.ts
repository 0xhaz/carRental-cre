import apiClient from "./axios";
import { User, UserRole } from "@/src/types";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  walletAddress?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export const authApi = {
  // Login
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post("/user/login", credentials);
    return data;
  },

  // Register
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const { data } = await apiClient.post("/user/register", userData);
    return data;
  },

  // Get current user data
  getUserData: async (): Promise<{ success: boolean; user: User }> => {
    const { data } = await apiClient.get("/user/data");
    return data;
  },

  // Update user role
  updateRole: async (role: UserRole): Promise<{ success: boolean; user: User }> => {
    const { data } = await apiClient.post("/user/update-role", { role });
    return data;
  },
};
