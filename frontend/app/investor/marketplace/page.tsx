"use client";

import { useState, useEffect } from "react";
import { InvestmentCard, InvestmentCardSkeleton } from "@/components/investor";
import { InvestmentModal } from "@/components/investor";
import { Heading, Paragraph, Badge } from "@/components/ui";
import { generateMockVehicles } from "@/lib/mockData";
import { Vehicle } from "@/types";
import { useAccount } from "wagmi";

export default function InvestorMarketplace() {
  const { isConnected } = useAccount();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    // Simulate loading vehicles with fundraising
    const loadVehicles = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const allVehicles = generateMockVehicles(12);
      // Filter only vehicles with active fundraising
      const fundraisingVehicles = allVehicles.filter(
        (v) => v.fundraising?.active
      );
      setVehicles(fundraisingVehicles);
      setIsLoading(false);
    };

    loadVehicles();
  }, []);

  const handleInvest = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v._id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
    }
  };

  const handleInvestmentSuccess = (amount: number) => {
    // In a real app, this would update the backend and refresh data
    console.log("Investment successful:", amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Heading as="h1" className="mb-2">
              Investment Marketplace
            </Heading>
            <Paragraph className="text-lg">
              Browse and invest in rental vehicles to earn passive income
            </Paragraph>
          </div>
          {isConnected && (
            <Badge variant="success" className="mt-2">
              🔗 Wallet Connected
            </Badge>
          )}
        </div>

        {/* Wallet Connection Notice */}
        {!isConnected && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Connect your wallet to invest on-chain and track your investments
              in real-time on the blockchain.
            </p>
          </div>
        )}
      </div>

      {/* Investment Opportunities Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <InvestmentCardSkeleton key={i} />
          ))}
        </div>
      ) : vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <InvestmentCard
              key={vehicle._id}
              vehicle={vehicle}
              onInvest={handleInvest}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Paragraph className="text-lg text-gray-600">
            No active fundraising campaigns at the moment.
          </Paragraph>
          <Paragraph className="mt-2 text-sm text-gray-500">
            Check back later for new investment opportunities.
          </Paragraph>
        </div>
      )}

      {/* Investment Modal */}
      {selectedVehicle && (
        <InvestmentModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onSuccess={handleInvestmentSuccess}
        />
      )}
    </div>
  );
}
