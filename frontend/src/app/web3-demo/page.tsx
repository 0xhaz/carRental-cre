"use client";

/**
 * Web3 Demo Page
 * Example usage of all Web3 components and hooks
 * Updated for native ETH payment system
 */

import { WalletConnect } from "@/components/web3/WalletConnect";
import { TokenBalance } from "@/components/web3/TokenBalance";
import { useMyTokenBalance } from "@/hooks/usePaymentToken";
import { useVehicleInfo, useMyVehicleCount } from "@/hooks/useVehicleData";
import { useBookingDetails } from "@/hooks/useRentalOperations";
import { useMyInvestorRequest, useMyTotalInvestment } from "@/hooks/useInvestment";
import { useAccount } from "wagmi";
import { useState } from "react";

export default function Web3DemoPage() {
  const { isConnected, address } = useAccount();
  const [testVehicleId, setTestVehicleId] = useState("1");
  const [testBookingId, setTestBookingId] = useState("1");

  // Data hooks
  const { data: vehicleCount } = useMyVehicleCount();
  const { data: vehicleInfo } = useVehicleInfo(BigInt(testVehicleId || "0"));
  const { data: bookingDetails } = useBookingDetails(BigInt(testBookingId || "0"));
  const { data: investorRequest } = useMyInvestorRequest();
  const { formatted: totalInvestment } = useMyTotalInvestment();
  const { formatted: balance } = useMyTokenBalance();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Web3 Integration Demo</h1>

      {/* Wallet Connection */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">1. Wallet Connection</h2>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <WalletConnect />
        </div>
      </section>

      {!isConnected ? (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <p className="text-yellow-800">
            Connect your wallet above to see the rest of the demo
          </p>
        </div>
      ) : (
        <>
          {/* ETH Balance */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">2. ETH Balance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">Compact View</h3>
                <TokenBalance showFull={false} />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">Full View</h3>
                <TokenBalance showFull={true} />
              </div>
            </div>
          </section>

          {/* Contract Reads */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">3. Reading Contract Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* My Vehicles */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">My Vehicle Count</h3>
                <p className="text-3xl font-bold text-primary">
                  {vehicleCount?.toString() || "0"}
                </p>
                <p className="text-sm text-gray-600 mt-2">Vehicles owned by your wallet</p>
              </div>

              {/* Investor Status */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">Investor Status</h3>
                <p className="text-3xl font-bold text-primary">
                  {investorRequest ? "Active" : "None"}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Total invested: {totalInvestment} ETH
                </p>
              </div>

              {/* Vehicle Info */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">Vehicle Info</h3>
                <input
                  type="number"
                  value={testVehicleId}
                  onChange={(e) => setTestVehicleId(e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2"
                  placeholder="Vehicle ID"
                />
                {vehicleInfo ? (
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(vehicleInfo, (_key, value) =>
                      typeof value === "bigint" ? value.toString() : value,
                    2)}
                  </pre>
                ) : null}
              </div>

              {/* Booking Details */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">Booking Details</h3>
                <input
                  type="number"
                  value={testBookingId}
                  onChange={(e) => setTestBookingId(e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2"
                  placeholder="Booking ID"
                />
                {bookingDetails ? (
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(bookingDetails, (_key, value) =>
                      typeof value === "bigint" ? value.toString() : value,
                    2)}
                  </pre>
                ) : null}
              </div>
            </div>
          </section>

          {/* User Info */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">4. Connected Wallet Info</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-mono font-semibold">{address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Balance</p>
                  <p className="font-semibold">{balance} ETH</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Code Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">5. Code Examples</h2>
        <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-auto">
          <pre className="text-sm">
{`// Import hooks (native ETH - no ERC-20 tokens)
import { useMyTokenBalance } from "@/hooks/usePaymentToken";
import { useVehicleInfo } from "@/hooks/useVehicleData";
import { useBookingDetails } from "@/hooks/useRentalOperations";
import { useMyInvestorRequest } from "@/hooks/useInvestment";

// Use in component
function MyComponent() {
  const { formatted: balance } = useMyTokenBalance();
  const { data: vehicleInfo } = useVehicleInfo(1n);
  const { data: booking } = useBookingDetails(1n);
  const { data: request } = useMyInvestorRequest();

  return (
    <div>
      <p>Balance: {balance} ETH</p>
      <p>Vehicle: {vehicleInfo?.vin}</p>
      <p>Request Status: {request?.status}</p>
    </div>
  );
}`}
          </pre>
        </div>
      </section>
    </div>
  );
}
