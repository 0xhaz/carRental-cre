"use client";

/**
 * Web3 Demo Page
 * Test all wallet authentication features
 */

import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { WalletAuthModal } from "@/components/web3/WalletAuthModal";
import { WalletConnect } from "@/components/web3/WalletConnect";
import { TokenBalance } from "@/components/web3/TokenBalance";
import { BindWalletButton } from "@/components/web3/BindWalletButton";
import { useUserStore } from "@/store/userStore";

export default function Web3DemoPage() {
  const [showWalletAuth, setShowWalletAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { user, isAuthenticated, logout } = useUserStore();

  const handleWalletAuthSuccess = (token: string, user: any) => {
    console.log("Wallet auth successful!", { token, user });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 Web3 Features Demo
          </h1>
          <p className="text-gray-600">
            Test all wallet authentication and Web3 features
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">📊 Current Status</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">Wallet Connected:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                {isConnected ? 'Yes' : 'No'}
              </span>
            </div>

            {isConnected && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">Wallet Address:</span>
                <span className="text-sm font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">User Authenticated:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                {isAuthenticated ? 'Yes' : 'No'}
              </span>
            </div>

            {user && (
              <>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">User Name:</span>
                  <span className="text-sm">{user.name}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">User Role:</span>
                  <span className="text-sm capitalize">{user.role}</span>
                </div>
                {user.walletAddress && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Bound Wallet:</span>
                    <span className="text-sm font-mono">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Feature 1: Basic Wallet Connection */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">1️⃣ Basic Wallet Connection</h2>
          <p className="text-gray-600 mb-4">
            Connect your wallet (MetaMask, WalletConnect, etc.)
          </p>
          <WalletConnect />
          {isConnected && (
            <button
              onClick={() => disconnect()}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Disconnect Wallet
            </button>
          )}
        </div>

        {/* Feature 2: Wallet Authentication */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">2️⃣ Wallet Authentication</h2>
          <p className="text-gray-600 mb-4">
            Login or register using only your wallet (no email/password)
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setAuthMode("login");
                setShowWalletAuth(true);
              }}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
            >
              🔑 Login with Wallet
            </button>

            <button
              onClick={() => {
                setAuthMode("register");
                setShowWalletAuth(true);
              }}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
            >
              ✨ Register with Wallet
            </button>
          </div>

          {isAuthenticated && (
            <button
              onClick={logout}
              className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          )}
        </div>

        {/* Feature 3: Bind Wallet to Account */}
        {isAuthenticated && !user?.walletAddress && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-4">3️⃣ Bind Wallet to Account</h2>
            <p className="text-gray-600 mb-4">
              You're logged in with email/password. Connect your wallet to enable Web3 features.
            </p>
            <BindWalletButton
              onSuccess={(updatedUser) => {
                console.log("Wallet bound!", updatedUser);
              }}
            />
          </div>
        )}

        {/* Feature 4: Token Balance */}
        {isConnected && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-4">4️⃣ Token Balance</h2>
            <p className="text-gray-600 mb-4">
              View your RegShield token (RGSD) balance
            </p>
            <TokenBalance showFull={true} />
          </div>
        )}

        {/* Documentation */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            📚 How to Use
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Click "Login with Wallet" or "Register with Wallet"</li>
            <li>Connect your wallet (MetaMask recommended)</li>
            <li>Sign the message to prove wallet ownership</li>
            <li>You'll be authenticated and can access Web3 features!</li>
          </ol>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> This is a demo page. In production, wallet auth buttons will be integrated into your login modal and navigation.
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Auth Modal */}
      <WalletAuthModal
        isOpen={showWalletAuth}
        onClose={() => setShowWalletAuth(false)}
        mode={authMode}
        onSuccess={handleWalletAuthSuccess}
      />
    </div>
  );
}
