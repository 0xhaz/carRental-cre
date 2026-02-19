"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store";
import { UserRole } from "@/types";
import { toast } from "react-hot-toast";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { authApi, kycApi } from "@/lib/api";
import { Copy, Check, AlertCircle, Wallet } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated, isLoading: userLoading, isHydrated } = useUserStore();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [isChangingWallet, setIsChangingWallet] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [isLoadingKyc, setIsLoadingKyc] = useState(true);

  // Redirect if not authenticated or not investor/rentor
  useEffect(() => {
    if (!isHydrated) return;
    if (!userLoading && (!isAuthenticated || !user)) {
      router.push("/");
    } else if (user && user.role !== UserRole.INVESTOR && user.role !== UserRole.RENTOR) {
      router.push("/");
    }
  }, [isAuthenticated, user, userLoading, isHydrated, router]);

  // Load KYC status
  useEffect(() => {
    const loadKycStatus = async () => {
      try {
        const response = await kycApi.getStatus();
        if (response.success) {
          setKycStatus(response.data);
        }
      } catch (error) {
        console.error("Failed to load KYC status:", error);
      } finally {
        setIsLoadingKyc(false);
      }
    };

    if (user) {
      loadKycStatus();
    }
  }, [user]);

  const handleCopyWallet = () => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      toast.success("Wallet address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartChangeWallet = () => {
    if (kycStatus?.status === "approved") {
      setShowWarning(true);
    } else {
      setIsChangingWallet(true);
    }
  };

  const handleConfirmChange = () => {
    setShowWarning(false);
    setIsChangingWallet(true);
  };

  const handleConnectNewWallet = async () => {
    try {
      const connector = connectors[0]; // MetaMask
      if (!connector) {
        toast.error("No wallet connector found");
        return;
      }

      connect({ connector });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error("Failed to connect wallet");
    }
  };

  const handleSaveNewWallet = async () => {
    if (!address) {
      toast.error("Please connect a wallet first");
      return;
    }

    if (address === user?.walletAddress) {
      toast.error("This is already your current wallet address");
      return;
    }

    try {
      // Bind new wallet to account
      const response = await authApi.bindWallet({ walletAddress: address });

      if (response.success) {
        setUser(response.user);
        toast.success("Wallet address updated successfully!");

        // Redirect to verification wizard for KYC resubmission
        setTimeout(() => {
          router.push(`/verification?role=${user?.role}`);
        }, 1500);
      }
    } catch (error: any) {
      console.error("Failed to update wallet:", error);
      toast.error(error.response?.data?.message || "Failed to update wallet address");
    }
  };

  const handleCancelChange = () => {
    setIsChangingWallet(false);
    setShowWarning(false);
    if (isConnected && address !== user?.walletAddress) {
      disconnect();
    }
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and wallet settings</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <p className="text-lg">{user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
              <span className="inline-block px-3 py-1 bg-primary text-white rounded-full text-sm">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Wallet Address</h2>
            {!isChangingWallet && (
              <button
                onClick={handleStartChangeWallet}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors"
              >
                Change Wallet
              </button>
            )}
          </div>

          {!isChangingWallet ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Current Wallet Address
                </label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Wallet size={20} className="text-gray-600" />
                  <code className="flex-1 text-sm font-mono truncate">
                    {user.walletAddress || "No wallet connected"}
                  </code>
                  {user.walletAddress && (
                    <button
                      onClick={handleCopyWallet}
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                    >
                      {copied ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Copy size={18} className="text-gray-600" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {!isLoadingKyc && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    KYC Status
                  </label>
                  <div className="flex items-center gap-2">
                    {kycStatus?.status === "approved" && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        ✅ Approved
                      </span>
                    )}
                    {kycStatus?.status === "pending" && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        ⏳ Pending Review
                      </span>
                    )}
                    {kycStatus?.status === "rejected" && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                        ❌ Rejected
                      </span>
                    )}
                    {!kycStatus?.hasKYC && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                        Not Submitted
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Warning Message */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-yellow-900">Important Notice</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      Changing your wallet address will require you to resubmit your KYC documents
                      for verification. Your current KYC status will be reset to pending.
                    </p>
                  </div>
                </div>
              </div>

              {/* New Wallet Connection */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  New Wallet Address
                </label>
                {!isConnected || address === user.walletAddress ? (
                  <button
                    onClick={handleConnectNewWallet}
                    className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors flex items-center justify-center gap-2"
                  >
                    <Wallet size={20} />
                    Connect New Wallet
                  </button>
                ) : (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 font-medium mb-1">Connected Wallet</p>
                    <code className="text-sm font-mono text-green-900 break-all">
                      {address}
                    </code>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelChange}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNewWallet}
                  disabled={!isConnected || address === user.walletAddress}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save & Resubmit KYC
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Warning Modal */}
        {showWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="text-yellow-600 flex-shrink-0" size={24} />
                <div>
                  <h3 className="text-lg font-semibold mb-2">KYC Resubmission Required</h3>
                  <p className="text-gray-600 text-sm">
                    Your KYC has already been approved. Changing your wallet address will reset
                    your KYC status, and you'll need to resubmit your documents for verification.
                  </p>
                  <p className="text-gray-600 text-sm mt-2">
                    During the review period, you may have limited access to platform features.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWarning(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmChange}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Continue Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
