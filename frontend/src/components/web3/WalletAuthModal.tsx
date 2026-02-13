"use client";

/**
 * Wallet Authentication Modal
 * Allows users to login or register using their wallet
 */

import { useState } from "react";
import { useConnect, useAccount } from "wagmi";
import { useWalletAuth, useWalletLogin, useWalletRegister } from "@/hooks/useWalletAuth";
import { UserRole } from "@/types";

interface WalletAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "login" | "register";
  onSuccess?: (token: string, user: any) => void;
}

export function WalletAuthModal({
  isOpen,
  onClose,
  mode = "login",
  onSuccess,
}: WalletAuthModalProps) {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { loginWithWallet, isLoading: isLoginLoading } = useWalletLogin();
  const { registerWithWallet, isLoading: isRegisterLoading } = useWalletRegister();

  const [currentMode, setCurrentMode] = useState<"login" | "register">(mode);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("renter");

  if (!isOpen) return null;

  const handleConnectorClick = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      await connect({ connector });
      // After connection, show the auth form
      setShowForm(true);
    }
  };

  const handleAuthenticate = async () => {
    if (currentMode === "login") {
      await loginWithWallet((token, user) => {
        onSuccess?.(token, user);
        onClose();
      });
    } else {
      if (!name.trim()) {
        return;
      }
      await registerWithWallet(name, role, (token, user) => {
        onSuccess?.(token, user);
        onClose();
      });
    }
  };

  const isLoading = isLoginLoading || isRegisterLoading || isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentMode === "login" ? "Login" : "Register"} with Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Connection Status */}
        {isConnected && address && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">
                Connected: {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
          </div>
        )}

        {/* Step 1: Connect Wallet */}
        {!isConnected && (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Connect your wallet to {currentMode === "login" ? "login" : "create an account"}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnectorClick(connector.id)}
                  disabled={isPending}
                  className="flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-200 hover:border-primary hover:bg-primary hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <span className="text-xl">{getConnectorIcon(connector.name)}</span>
                  <span>{connector.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Register Form (for new users) */}
        {isConnected && currentMode === "register" && !showForm && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I want to *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isLoading}
              >
                <option value="renter">Rent vehicles</option>
                <option value="rentor">List my vehicles</option>
                <option value="investor">Invest in vehicles</option>
              </select>
            </div>

            <button
              onClick={() => setShowForm(true)}
              disabled={!name.trim() || isLoading}
              className="w-full px-6 py-3 bg-primary hover:bg-primary-dull text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Sign Message & Authenticate */}
        {isConnected && (currentMode === "login" || showForm) && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Next step:</strong> You'll be asked to sign a message with your wallet.
                This proves you own the wallet address and allows you to {currentMode === "login" ? "login" : "register"}.
              </p>
            </div>

            <button
              onClick={handleAuthenticate}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-primary hover:bg-primary-dull text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Sign Message to {currentMode === "login" ? "Login" : "Register"}</span>
              )}
            </button>
          </div>
        )}

        {/* Toggle between login and register */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            {currentMode === "login" ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => {
                setCurrentMode(currentMode === "login" ? "register" : "login");
                setShowForm(false);
                setName("");
                setRole("renter");
              }}
              className="ml-2 text-primary hover:text-primary-dull font-semibold"
              disabled={isLoading}
            >
              {currentMode === "login" ? "Register" : "Login"}
            </button>
          </p>
        </div>

        {/* Security Note */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            🔒 We'll never ask for your private keys or seed phrase. The signature only proves you own the wallet.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Get connector icon
 */
function getConnectorIcon(name: string): string {
  const icons: Record<string, string> = {
    MetaMask: "🦊",
    "MetaMask SDK": "🦊",
    WalletConnect: "🔗",
    "Coinbase Wallet": "💼",
    Injected: "🔌",
  };
  return icons[name] || "💳";
}
