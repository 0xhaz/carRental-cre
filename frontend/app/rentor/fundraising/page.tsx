"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InvestmentCard, InvestmentCardSkeleton } from "@/components/investor";
import { CreateCampaignModal } from "@/components/rentor";
import { VerificationStatusBanner } from "@/components/shared/VerificationStatusBanner";
import { Heading, Paragraph, Button, Card, CardContent, Badge } from "@/components/ui";
import { FundraisingCampaign } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useCanRentorAct } from "@/hooks/useComplianceStatus";
import { investmentApi } from "@/lib/api";
import Link from "next/link";

export default function RentorFundraising() {
  const router = useRouter();
  const { canAct: canCreateCampaign, reason: complianceReason } = useCanRentorAct();
  const [campaigns, setCampaigns] = useState<FundraisingCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await investmentApi.getRentorCampaigns();

      if (response.success) {
        setCampaigns(response.data || []);
      }
    } catch (error: any) {
      console.error("Failed to load campaigns:", error);
      toast.error(error.response?.data?.message || "Failed to load campaigns");
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Calculate stats from campaigns
  const totalRaised = campaigns.reduce((sum, c) => sum + (c.currentAmount || 0), 0);
  const totalTarget = campaigns.reduce((sum, c) => sum + (c.targetAmount || 0), 0);
  const totalInvestors = campaigns.reduce((sum, c) => sum + (c.investorCount || 0), 0);

  const handleCreateCampaignClick = () => {
    if (!canCreateCampaign) {
      toast.error(complianceReason || "Please complete verification first");
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateCampaignSuccess = () => {
    // Refetch campaigns
    loadCampaigns();
  };

  const handleManageCampaign = (campaignId: string) => {
    // Navigate to campaign management/detail page
    toast.info("Campaign management coming soon!");
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
          <Button onClick={handleCreateCampaignClick} disabled={!canCreateCampaign}>
            {canCreateCampaign ? "Create Campaign" : "Verification Required"}
          </Button>
        </div>
      </div>

      {/* Verification Status Banner */}
      <VerificationStatusBanner roleType="rentor" className="mb-8" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Active Campaigns</p>
            <p className="text-3xl font-bold text-blue-600">{campaigns.length}</p>
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
          <Badge variant="primary">{campaigns.length} Active</Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <InvestmentCardSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <InvestmentCard
                key={campaign._id}
                vehicle={typeof campaign.vehicle === "object" ? campaign.vehicle : undefined}
                onInvest={() => handleManageCampaign(campaign._id)}
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
              onClick={handleCreateCampaignClick}
              disabled={!canCreateCampaign}
            >
              {canCreateCampaign ? "Create Your First Campaign" : "Complete Verification First"}
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
