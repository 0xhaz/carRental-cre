import apiClient from "./axios";
import { User, UserRole } from "@/types";

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

export interface WalletNonceResponse {
  success: boolean;
  nonce: string;
  message: string;
}

export interface WalletVerifyData {
  walletAddress: string;
  signature: string;
  name?: string;
  role?: UserRole;
}

export interface BindWalletData {
  walletAddress: string;
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

  // ============ WALLET AUTHENTICATION ============

  // Get nonce for wallet signature
  getWalletNonce: async (walletAddress: string): Promise<WalletNonceResponse> => {
    const { data } = await apiClient.post("/user/wallet/nonce", { walletAddress });
    return data;
  },

  // Verify wallet signature and login/register
  verifyWallet: async (verifyData: WalletVerifyData): Promise<AuthResponse> => {
    const { data } = await apiClient.post("/user/wallet/verify", verifyData);
    return data;
  },

  // Bind wallet to existing account
  bindWallet: async (bindData: BindWalletData): Promise<{ success: boolean; user: User; message: string }> => {
    const { data } = await apiClient.post("/user/wallet/bind", bindData);
    return data;
  },
};
