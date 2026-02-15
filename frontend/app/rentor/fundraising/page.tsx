"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InvestmentCard, InvestmentCardSkeleton } from "@/components/investor";
import { CreateCampaignModal, ManageCampaignModal } from "@/components/rentor";
import { Heading, Paragraph, Button, Card, CardContent, Badge } from "@/components/ui";
import { FundraisingCampaign, Vehicle } from "@/types";
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
  const [manageCampaign, setManageCampaign] = useState<{ campaign: FundraisingCampaign; vehicle?: Vehicle } | null>(null);

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

  // Split campaigns by status
  const activeCampaigns = campaigns.filter((c) => c.status !== "cancelled");
  const cancelledCampaigns = campaigns.filter((c) => c.status === "cancelled");

  // Calculate stats from active campaigns only
  const totalRaised = activeCampaigns.reduce((sum, c) => sum + (c.currentAmount || 0), 0);
  const totalTarget = activeCampaigns.reduce((sum, c) => sum + (c.targetAmount || 0), 0);
  const totalInvestors = activeCampaigns.reduce((sum, c) => sum + ((c as any).investorCount || 0), 0);

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

  const handleManageCampaign = (campaign: FundraisingCampaign) => {
    const vehicle = typeof campaign.vehicle === "object" ? (campaign.vehicle as unknown as Vehicle) : undefined;
    setManageCampaign({ campaign, vehicle });
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Active Campaigns</p>
            <p className="text-3xl font-bold text-blue-600">{activeCampaigns.length}</p>
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
          <Badge variant="primary">{activeCampaigns.length} Active</Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <InvestmentCardSkeleton key={i} />
            ))}
          </div>
        ) : activeCampaigns.filter((c) => typeof c.vehicle === "object" && c.vehicle).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCampaigns
              .filter((c) => typeof c.vehicle === "object" && c.vehicle)
              .map((campaign) => (
                <InvestmentCard
                  key={campaign._id}
                  vehicle={campaign.vehicle as unknown as Vehicle}
                  onInvest={() => handleManageCampaign(campaign)}
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

      {/* Cancelled Campaigns */}
      {!isLoading && cancelledCampaigns.filter((c) => typeof c.vehicle === "object" && c.vehicle).length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <Heading as="h2">Cancelled Campaigns</Heading>
            <Badge variant="error">{cancelledCampaigns.length} Cancelled</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cancelledCampaigns
              .filter((c) => typeof c.vehicle === "object" && c.vehicle)
              .map((campaign) => (
                <div key={campaign._id} className="relative opacity-60">
                  <InvestmentCard
                    vehicle={campaign.vehicle as unknown as Vehicle}
                    onInvest={() => handleManageCampaign(campaign)}
                    basePath="rentor"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      Cancelled
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

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

      {/* Manage Campaign Modal */}
      {manageCampaign && (
        <ManageCampaignModal
          campaign={manageCampaign.campaign}
          vehicle={manageCampaign.vehicle}
          onClose={() => setManageCampaign(null)}
          onCampaignUpdated={loadCampaigns}
        />
      )}
    </div>
  );
}
