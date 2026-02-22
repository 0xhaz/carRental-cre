"use client";

import { X } from "lucide-react";
import { Button, Card } from "@/components/ui";

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sampleUsers = [
  {
    role: "Investor",
    email: "investor@test.com",
    password: "password123",
    description: "Access marketplace, view investments, and earn revenue from tokenized vehicles",
    wallet: "0x54812efcb8633224edc32a268a7d580e0abfb9ae",
  },
  {
    role: "Rentor",
    email: "rentor@test.com",
    password: "password123",
    description: "List vehicles, manage fleet, raise capital, and track bookings",
    wallet: "0x0E128580d848fB51849ab6564467A9BA79B4820c",
  },
  {
    role: "Renter",
    email: "renter@test.com",
    password: "password123",
    description: "Browse verified vehicles and book short-term rentals",
    wallet: "0x..." // Add renter wallet if available
  },
  {
    role: "Admin",
    email: "admin@test.com",
    password: "password123",
    description: "Manage KYC, compliance, milestones, and platform operations",
    wallet: "Admin wallet",
  },
];

export function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">User Guide</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Getting Started */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🚀 Getting Started
              </h3>
              <ol className="space-y-2 text-gray-700">
                <li className="flex gap-2">
                  <span className="font-semibold min-w-6">1.</span>
                  <span><strong>Connect Your Wallet:</strong> Click the wallet connect button in the navbar to connect your Web3 wallet (MetaMask, WalletConnect, etc.)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold min-w-6">2.</span>
                  <span><strong>Register/Login:</strong> After connecting your wallet, click the "Login" button and create an account or sign in with test credentials below</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold min-w-6">3.</span>
                  <span><strong>Complete Verification:</strong> Follow the onboarding flow to complete KYC and wallet binding</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold min-w-6">4.</span>
                  <span><strong>Explore Your Dashboard:</strong> Access role-specific features based on whether you're an Investor, Rentor, or Renter</span>
                </li>
              </ol>
            </section>

            {/* Important Notes */}
            <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                ⚠️ Important Notes
              </h4>
              <ul className="space-y-1 text-sm text-amber-800">
                <li>• Make sure your wallet is connected to <strong>Sepolia Testnet</strong></li>
                <li>• If switching accounts, disconnect wallet at <code className="bg-amber-100 px-1 rounded">/web3-demo</code> first, then connect with a different address</li>
                <li>• Each user account is bound to a specific wallet address</li>
              </ul>
            </section>

            {/* Sample Test Users */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                👥 Test User Accounts
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Use these pre-configured accounts to explore different roles:
              </p>

              <div className="grid gap-4">
                {sampleUsers.map((user) => (
                  <div
                    key={user.role}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{user.role}</h4>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Test Account
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{user.description}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex gap-2">
                        <span className="text-gray-500 min-w-20">Email:</span>
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-900">
                          {user.email}
                        </code>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-500 min-w-20">Password:</span>
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-900">
                          {user.password}
                        </code>
                      </div>
                      {user.wallet && (
                        <div className="flex gap-2">
                          <span className="text-gray-500 min-w-20">Wallet:</span>
                          <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-900 text-xs break-all">
                            {user.wallet}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Role Descriptions */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🔑 Role Overview
              </h3>
              <div className="grid gap-3">
                <div className="flex gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">Investor</h4>
                    <p className="text-sm text-gray-600">
                      Fund vehicle purchases via tokenized campaigns, receive ERC-3643 AssetTokens + RevenueTokens, and earn quarterly rental income
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-2xl">🚗</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">Rentor</h4>
                    <p className="text-sm text-gray-600">
                      List vehicles, mint VehicleNFTs, raise capital through investor campaigns, and earn 10% operator fee on bookings
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-2xl">🔑</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">Renter</h4>
                    <p className="text-sm text-gray-600">
                      Browse compliance-verified vehicles, pay in ETH via smart contracts, and enjoy transparent pricing
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end">
              <Button onClick={onClose}>Got it!</Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
