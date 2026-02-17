"use client";

import { useState, useEffect } from "react";
import { InvestmentCard, InvestmentCardSkeleton } from "@/components/investor";
import { InvestmentModal } from "@/components/investor";
import { Heading, Paragraph, Badge } from "@/components/ui";
import { investmentApi } from "@/lib/api";
import { Vehicle, FundraisingCampaign } from "@/types";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";

// Map a campaign (with populated vehicle) to a Vehicle with fundraising info
function campaignToVehicle(campaign: FundraisingCampaign & { vehicle: any }): Vehicle | null {
  const v = campaign.vehicle;
  if (!v || typeof v === "string") return null;

  return {
    ...v,
    _id: v._id,
    fundraising: {
      active: true,
      campaignId: campaign._id,
      targetAmount: campaign.targetAmount,
      currentAmount: campaign.currentAmount,
      minInvestment: campaign.minInvestment,
      maxInvestment: campaign.maxInvestment,
      expectedROI: campaign.expectedROI,
      investorCount: v.fundraising?.investorCount ?? 0,
      investors: v.fundraising?.investors ?? [],
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    },
  } as Vehicle;
}

export default function InvestorMarketplace() {
  const { isConnected } = useAccount();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const loadMarketplace = async () => {
    setIsLoading(true);
    try {
      const res = await investmentApi.getMarketplace();
      if (res.success && res.data) {
        const mapped = res.data
          .map((campaign: any) => campaignToVehicle(campaign))
          .filter((v): v is Vehicle => v !== null);
        setVehicles(mapped);
      }
    } catch (error) {
      console.error("Failed to load marketplace:", error);
      toast.error("Failed to load marketplace");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMarketplace();
  }, []);

  const handleInvest = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v._id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
    }
  };

  const handleInvestmentSuccess = (amount: number) => {
    console.log("Investment successful:", amount);
    // Refresh marketplace data after successful investment
    loadMarketplace();
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
