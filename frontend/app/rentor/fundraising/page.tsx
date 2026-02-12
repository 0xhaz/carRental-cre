"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InvestmentCard, InvestmentCardSkeleton } from "@/src/components/investor";
import { CreateCampaignModal } from "@/src/components/rentor";
import { Heading, Paragraph, Button, Card, CardContent, Badge } from "@/src/components/ui";
import { generateMockVehicles, generateMockCampaigns } from "@/src/lib/mockData";
import { Vehicle, FundraisingCampaign } from "@/src/types";
import { formatCurrency } from "@/src/lib/utils";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function RentorFundraising() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [campaigns, setCampaigns] = useState<FundraisingCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const loadFundraising = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockVehicles = generateMockVehicles(12);
      const mockCampaigns = generateMockCampaigns(5);

      // Filter vehicles with active fundraising
      const fundraisingVehicles = mockVehicles.filter((v) => v.fundraising?.active);

      setVehicles(fundraisingVehicles);
      setCampaigns(mockCampaigns);
      setIsLoading(false);
    };

    loadFundraising();
  }, []);

  // Calculate stats
  const totalRaised = vehicles.reduce(
    (sum, v) => sum + (v.fundraising?.currentAmount || 0),
    0
  );
  const totalTarget = vehicles.reduce(
    (sum, v) => sum + (v.fundraising?.targetAmount || 0),
    0
  );
  const totalInvestors = vehicles.reduce(
    (sum, v) => sum + (v.fundraising?.investors?.length || 0),
    0
  );

  const handleCreateCampaignSuccess = () => {
    // Simulate refetch
    setTimeout(() => {
      const loadFundraising = async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockVehicles = generateMockVehicles(12);
        const fundraisingVehicles = mockVehicles.filter((v) => v.fundraising?.active);
        setVehicles(fundraisingVehicles);
        setIsLoading(false);
      };
      loadFundraising();
    }, 500);
  };

  const handleManageCampaign = (vehicleId: string) => {
    // Navigate to vehicle detail/management page
    router.push(`/rentor/vehicle/${vehicleId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <Heading as="h1" className="mb-2">
              Fundraising Campaigns
            </Heading>
            <Paragraph className="text-lg">
              Create and manage fundraising for your vehicles
            </Paragraph>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Active Campaigns</p>
            <p className="text-3xl font-bold text-blue-600">{vehicles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Total Raised</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(totalRaised)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Target Amount</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(totalTarget)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Total Investors</p>
            <p className="text-3xl font-bold text-purple-600">{totalInvestors}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Heading as="h2">Active Campaigns</Heading>
          <Badge variant="primary">{vehicles.length} Active</Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <InvestmentCardSkeleton key={i} />
            ))}
          </div>
        ) : vehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <InvestmentCard
                key={vehicle._id}
                vehicle={vehicle}
                onInvest={handleManageCampaign}
                basePath="rentor"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Paragraph className="text-lg text-gray-600">
              You don't have any active fundraising campaigns.
            </Paragraph>
            <Paragraph className="mt-2 text-sm text-gray-500">
              Create a campaign to raise funds for your vehicles.
            </Paragraph>
            <Button
              className="mt-4"
              onClick={() => setShowCreateModal(true)}
            >
              Create Your First Campaign
            </Button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <Heading as="h3" className="mb-2 text-blue-900">
            How Fundraising Works
          </Heading>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Create a campaign for your vehicle with a target amount</li>
            <li>• Investors can purchase asset tokens representing ownership</li>
            <li>• Raised funds are released based on milestone completion</li>
            <li>• Revenue from rentals is distributed to token holders</li>
            <li>• Track investor performance and manage distributions</li>
          </ul>
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateCampaignSuccess}
        />
      )}
    </div>
  );
}
