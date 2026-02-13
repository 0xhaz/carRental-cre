"use client";

/**
 * Web3 Demo Page
 * Example usage of all Web3 components and hooks
 */

import { WalletConnect } from "@/components/web3/WalletConnect";
import { TokenBalance } from "@/components/web3/TokenBalance";
import { useMyTokenBalance, useApproveToken, useTransferToken } from "@/hooks/usePaymentToken";
import { useTotalVehicles, useVehicleDetails } from "@/hooks/useVehicleData";
import { useMyBookings } from "@/hooks/useRentalOperations";
import { useMyInvestments } from "@/hooks/useInvestment";
import { useAccount } from "wagmi";
import { useState } from "react";

export default function Web3DemoPage() {
  const { isConnected, address } = useAccount();
  const [testVehicleId, setTestVehicleId] = useState("1");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferTo, setTransferTo] = useState("");

  // Data hooks
  const { data: totalVehicles } = useTotalVehicles();
  const { data: vehicleDetails } = useVehicleDetails(BigInt(testVehicleId || "0"));
  const { data: myBookings } = useMyBookings();
  const { data: myInvestments } = useMyInvestments();
  const { formatted: balance } = useMyTokenBalance();

  // Write hooks
  const { approve, isConfirming: isApproving } = useApproveToken();
  const { transfer, isConfirming: isTransferring } = useTransferToken();

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
            👆 Connect your wallet above to see the rest of the demo
          </p>
        </div>
      ) : (
        <>
          {/* Token Balance */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">2. Token Balance</h2>
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
              {/* Total Vehicles */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">Total Vehicles</h3>
                <p className="text-3xl font-bold text-primary">
                  {totalVehicles?.toString() || "0"}
                </p>
                <p className="text-sm text-gray-600 mt-2">Vehicles minted on platform</p>
              </div>

              {/* My Bookings */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">My Active Bookings</h3>
                <p className="text-3xl font-bold text-primary">
                  {Array.isArray(myBookings) ? myBookings.length : "0"}
                </p>
                <p className="text-sm text-gray-600 mt-2">Current rental bookings</p>
              </div>

              {/* My Investments */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">My Investments</h3>
                <p className="text-3xl font-bold text-primary">
                  {Array.isArray(myInvestments) ? myInvestments.length : "0"}
                </p>
                <p className="text-sm text-gray-600 mt-2">Active vehicle investments</p>
              </div>

              {/* Vehicle Details */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">Vehicle Details</h3>
                <input
                  type="number"
                  value={testVehicleId}
                  onChange={(e) => setTestVehicleId(e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2"
                  placeholder="Vehicle ID"
                />
                {vehicleDetails && (
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(vehicleDetails, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </section>

          {/* Token Operations */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">4. Token Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Approve */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-4">Approve Spending</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Spender Address"
                    className="w-full px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    className="w-full px-3 py-2 border rounded"
                  />
                  <button
                    disabled={isApproving}
                    className="w-full px-4 py-2 bg-primary hover:bg-primary-dull text-white rounded disabled:opacity-50"
                  >
                    {isApproving ? "Approving..." : "Approve"}
                  </button>
                </div>
              </div>

              {/* Transfer */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-4">Transfer Tokens</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="Recipient Address"
                    className="w-full px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full px-3 py-2 border rounded"
                  />
                  <button
                    onClick={() => transfer(transferTo as `0x${string}`, transferAmount)}
                    disabled={isTransferring || !transferTo || !transferAmount}
                    className="w-full px-4 py-2 bg-primary hover:bg-primary-dull text-white rounded disabled:opacity-50"
                  >
                    {isTransferring ? "Transferring..." : "Transfer"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* User Info */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">5. Connected Wallet Info</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-mono font-semibold">{address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Balance</p>
                  <p className="font-semibold">{balance} RGSD</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Code Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">6. Code Examples</h2>
        <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-auto">
          <pre className="text-sm">
{`// Import hooks
import { useMyTokenBalance } from "@/hooks/usePaymentToken";
import { useTotalVehicles } from "@/hooks/useVehicleData";
import { useMyBookings } from "@/hooks/useRentalOperations";

// Use in component
function MyComponent() {
  const { formatted: balance } = useMyTokenBalance();
  const { data: totalVehicles } = useTotalVehicles();
  const { data: bookings } = useMyBookings();

  return (
    <div>
      <p>Balance: {balance} RGSD</p>
      <p>Total Vehicles: {totalVehicles}</p>
      <p>My Bookings: {bookings?.length}</p>
    </div>
  );
}`}
          </pre>
        </div>
      </section>
    </div>
  );
}
