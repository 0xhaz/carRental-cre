/**
 * Wallet Authentication Hooks
 * Handles wallet-based authentication with signature verification
 */

import { useState } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { authApi } from "@/lib/api/authApi";
import { toast } from "react-hot-toast";
import { UserRole } from "@/types";

interface WalletAuthOptions {
  name?: string;
  role?: UserRole;
  onSuccess?: (token: string, user: any) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for wallet-based authentication
 * Handles the complete flow: connect -> sign -> verify -> login/register
 */
export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Authenticate with wallet
   * Gets nonce, signs it, and verifies with backend
   */
  const authenticateWithWallet = async (options: WalletAuthOptions = {}) => {
    if (!isConnected || !address) {
      const errorMsg = "Please connect your wallet first";
      setError(errorMsg);
      toast.error(errorMsg);
      options.onError?.(errorMsg);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get nonce from backend
      toast.loading("Requesting authentication nonce...", { id: "wallet-auth" });
      const nonceResponse = await authApi.getWalletNonce(address);

      if (!nonceResponse.success) {
        throw new Error(nonceResponse.message || "Failed to get nonce");
      }

      const { nonce, message } = nonceResponse;

      // Step 2: Sign the nonce with wallet
      toast.loading("Sign the message in your wallet...", { id: "wallet-auth" });
      const signature = await signMessageAsync({
        message: `Sign this message to authenticate with RegShield:\n\nNonce: ${nonce}`,
      });

      // Step 3: Verify signature with backend
      toast.loading("Verifying signature...", { id: "wallet-auth" });
      const verifyResponse = await authApi.verifyWallet({
        walletAddress: address,
        signature,
        name: options.name,
        role: options.role,
      });

      if (!verifyResponse.success) {
        // @ts-ignore - response may have message field on error
        throw new Error(verifyResponse.message || "Authentication failed");
      }

      // Success!
      const { token, user } = verifyResponse;

      // Store token in localStorage
      if (token) {
        localStorage.setItem("token", token);
      }

      toast.success(`Welcome ${user.name}!`, { id: "wallet-auth" });
      options.onSuccess?.(token, user);

      return { token, user };
    } catch (err: any) {
      const errorMsg = err.message || "Authentication failed";
      setError(errorMsg);
      toast.error(errorMsg, { id: "wallet-auth" });
      options.onError?.(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout and disconnect wallet
   */
  const logoutWallet = () => {
    disconnect();
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
  };

  return {
    authenticateWithWallet,
    logoutWallet,
    isLoading,
    error,
    isWalletConnected: isConnected,
    walletAddress: address,
  };
}

/**
 * Hook for binding wallet to existing account
 * Used when user is already logged in with email/password
 */
export function useBindWallet() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bindWallet = async (onSuccess?: (user: any) => void) => {
    if (!isConnected || !address) {
      const errorMsg = "Please connect your wallet first";
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    // Check if token exists (user is logged in)
    const token = localStorage.getItem("token");
    if (!token) {
      const errorMsg = "Please log in first";
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      toast.loading("Binding wallet to your account...", { id: "bind-wallet" });

      const response = await authApi.bindWallet({ walletAddress: address });

      if (!response.success) {
        throw new Error(response.message || "Failed to bind wallet");
      }

      toast.success("Wallet bound successfully!", { id: "bind-wallet" });
      onSuccess?.(response.user);

      return response.user;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to bind wallet";
      setError(errorMsg);
      toast.error(errorMsg, { id: "bind-wallet" });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    bindWallet,
    isLoading,
    error,
    isWalletConnected: isConnected,
    walletAddress: address,
  };
}

/**
 * Hook for wallet registration (new users only)
 */
export function useWalletRegister() {
  const { authenticateWithWallet, isLoading, error } = useWalletAuth();

  const registerWithWallet = async (
    name: string,
    role: UserRole = "renter",
    onSuccess?: (token: string, user: any) => void
  ) => {
    if (!name || name.trim().length === 0) {
      toast.error("Please provide your name");
      return null;
    }

    return authenticateWithWallet({
      name: name.trim(),
      role,
      onSuccess,
    });
  };

  return {
    registerWithWallet,
    isLoading,
    error,
  };
}

/**
 * Hook for wallet login (existing users)
 */
export function useWalletLogin() {
  const { authenticateWithWallet, isLoading, error } = useWalletAuth();

  const loginWithWallet = async (onSuccess?: (token: string, user: any) => void) => {
    return authenticateWithWallet({ onSuccess });
  };

  return {
    loginWithWallet,
    isLoading,
    error,
  };
}
