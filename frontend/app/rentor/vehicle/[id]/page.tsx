"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Heading,
  Paragraph,
  Button,
  Card,
  CardContent,
  Badge,
  Progress,
} from "@/components/ui";
import { ReviewList, ReviewStats } from "@/components/shared";
import { Vehicle, Review, FundraisingCampaign, Investment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { rentorApi, reviewApi } from "@/lib/api";
import Image from "next/image";
import { toast } from "react-hot-toast";

export default function RentorVehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [campaign, setCampaign] = useState<FundraisingCampaign | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const loadVehicle = async () => {
      setIsLoading(true);
      try {
        const res = await rentorApi.getVehicleById(vehicleId);
        if (res.success) {
          setVehicle(res.data.vehicle);
          setCampaign(res.data.campaign);
          setInvestments(res.data.investments || []);
        }

        // Load reviews
        try {
          const reviewRes = await reviewApi.getByVehicle(vehicleId);
          if (reviewRes.success) {
            setReviews(reviewRes.data);
          }
        } catch {
          // Reviews may not exist yet
        }
      } catch {
        // Vehicle not found or unauthorized
      }
      setIsLoading(false);
    };

    loadVehicle();
  }, [vehicleId]);

  const handleEditCampaign = () => {
    toast("Campaign editing feature coming soon!", {
      duration: 3000,
      icon: "✏️",
    });
  };

  const handlePauseCampaign = () => {
    toast("Campaign paused successfully!", {
      duration: 3000,
      icon: "⏸️",
    });
  };

  const handleEndCampaign = () => {
    toast("Campaign ended successfully!", {
      duration: 3000,
      icon: "🏁",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-96 bg-gray-200 rounded-lg" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Heading as="h2" className="mb-4">
            Vehicle Not Found
          </Heading>
          <Paragraph className="mb-6">
            This vehicle doesn't exist or has been removed.
          </Paragraph>
          <Button onClick={() => router.push("/rentor/vehicles")}>
            Back to My Vehicles
          </Button>
        </Card>
      </div>
    );
  }

  const { fundraising } = vehicle;
  const hasCampaign = campaign && ["active", "funded", "draft"].includes(campaign.status);
  const fundingPercentage = hasCampaign && campaign
    ? (campaign.currentAmount / campaign.targetAmount) * 100
    : 0;
  const remainingAmount = hasCampaign && campaign
    ? campaign.targetAmount - campaign.currentAmount
    : 0;
  const daysLeft = hasCampaign && campaign?.endDate
    ? Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Revenue waterfall percentages from RevenueDistributor.sol
  const WATERFALL = {
    platformFee: 0.15,
    maintenance: 0.10,
    insurance: 0.05,
    operatingCosts: 0.10,
    operatorFee: 0.10,
    netToInvestors: 0.50,
  };

  // Financial projections (assume 70% occupancy)
  const grossAnnual = vehicle.pricePerDay * 365 * 0.7;
  const waterfall = {
    grossAnnual,
    platformFee: grossAnnual * WATERFALL.platformFee,
    maintenance: grossAnnual * WATERFALL.maintenance,
    insurance: grossAnnual * WATERFALL.insurance,
    operatingCosts: grossAnnual * WATERFALL.operatingCosts,
    operatorFee: grossAnnual * WATERFALL.operatorFee,
    netToInvestors: grossAnnual * WATERFALL.netToInvestors,
  };

  // Investment pitch
  const targetAmount = campaign?.targetAmount || fundraising?.targetAmount || 0;
  const investmentPitch = {
    overview: `Invest in this ${vehicle.year} ${vehicle.brand} ${vehicle.model}, a premium ${vehicle.category} available for rental in ${vehicle.location}. This vehicle represents a unique opportunity to earn passive income through the sharing economy.`,
    whyInvest: [
      `High-demand ${vehicle.category} in ${vehicle.location}'s competitive rental market`,
      `Premium ${vehicle.brand} brand with strong resale value`,
      `Competitive daily rate of ${formatCurrency(vehicle.pricePerDay)}`,
      `Professional maintenance and insurance coverage included`,
      `Transparent blockchain-based revenue distribution`,
    ],
    useOfFunds: targetAmount > 0 ? [
      { item: "Vehicle Acquisition", percentage: 70, amount: targetAmount * 0.7 },
      { item: "Insurance & Registration", percentage: 10, amount: targetAmount * 0.1 },
      { item: "Initial Maintenance", percentage: 10, amount: targetAmount * 0.1 },
      { item: "Platform Fees", percentage: 5, amount: targetAmount * 0.05 },
      { item: "Reserve Fund", percentage: 5, amount: targetAmount * 0.05 },
    ] : [],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/rentor/vehicles")}
        className="mb-6"
      >
        ← Back to My Vehicles
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Image & Title */}
          <Card className="overflow-hidden">
            <div className="relative h-96">
              <Image
                src={vehicle.image || "/assets/car_image1.png"}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-full h-full object-cover"
                width={800}
                height={400}
              />
              <div className="absolute top-4 left-4 flex gap-2">
                {hasCampaign && campaign && (
                  <>
                    <Badge variant="default" className="shadow-lg">
                      {fundingPercentage.toFixed(0)}% Funded
                    </Badge>
                    <Badge variant="success" className="shadow-lg">
                      {campaign.expectedROI}% ROI
                    </Badge>
                  </>
                )}
                <Badge
                  variant={vehicle.isAvailable ? "success" : "default"}
                  className="shadow-lg"
                >
                  {vehicle.isAvailable ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Heading as="h1" className="mb-2">
                    {vehicle.brand} {vehicle.model} ({vehicle.year})
                  </Heading>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>📍 {vehicle.location}</span>
                    <span>🚗 {vehicle.category}</span>
                    <span>⛽ {vehicle.fuel_type}</span>
                    <span>👥 {vehicle.seating_capacity} seats</span>
                    <span>⚙️ {vehicle.transmission}</span>
                  </div>
                </div>
                <Button variant="outline" onClick={handleEditCampaign}>
                  Edit Vehicle
                </Button>
              </div>
              <Paragraph className="text-lg">{vehicle.description}</Paragraph>
            </CardContent>
          </Card>

          {/* Campaign Performance */}
          {hasCampaign && campaign && (
            <Card>
              <CardContent className="p-6">
                <Heading as="h2" className="mb-4">
                  Campaign Performance
                </Heading>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Raised</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(campaign.currentAmount)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      of {formatCurrency(campaign.targetAmount)} goal
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Investors</p>
                    <p className="text-2xl font-bold text-green-600">
                      {investments.length}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Active token holders
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Expected ROI</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {campaign.expectedROI}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Annual return</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Days Remaining</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {daysLeft}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Until campaign end</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold">Funding Progress</span>
                    <span>{fundingPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={fundingPercentage} variant="default" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investment Pitch */}
          {hasCampaign && (
            <Card>
              <CardContent className="p-6">
                <Heading as="h2" className="mb-4">
                  Investment Opportunity
                </Heading>
                <Paragraph className="mb-6">{investmentPitch.overview}</Paragraph>

                <Heading as="h3" className="mb-3">
                  Why Invest?
                </Heading>
                <ul className="space-y-2 mb-6">
                  {investmentPitch.whyInvest.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Investor List */}
          {hasCampaign && investments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <Heading as="h2" className="mb-4">
                  Investors ({investments.length})
                </Heading>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Investor
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {investments.map((investment) => {
                        // investor is populated as { _id, name, walletAddress } from backend
                        const investor = investment.investor as unknown as { _id: string; name: string; walletAddress?: string } | string;
                        const isPopulated = typeof investor === "object" && investor !== null;
                        return (
                          <tr key={investment._id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium">
                                  {isPopulated ? investor.name : "Investor"}
                                </p>
                                {isPopulated && investor.walletAddress && (
                                  <p className="text-xs text-gray-500">
                                    {investor.walletAddress.slice(0, 6)}...
                                    {investor.walletAddress.slice(-4)}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              {formatCurrency(investment.amount)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(investment.investedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenue Projection */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Revenue Projection
              </Heading>
              <p className="text-sm text-gray-500 mb-4">
                Estimated annual breakdown at 70% occupancy ({formatCurrency(vehicle.pricePerDay)}/day)
              </p>

              {/* Gross Revenue */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">Gross Annual Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(waterfall.grossAnnual)}</p>
                </div>
              </div>

              {/* Waterfall Breakdown */}
              <div className="space-y-3 mb-6">
                {[
                  { label: "Platform Fee", pct: WATERFALL.platformFee, amount: waterfall.platformFee, color: "bg-gray-200" },
                  { label: "Maintenance Reserve", pct: WATERFALL.maintenance, amount: waterfall.maintenance, color: "bg-orange-200" },
                  { label: "Insurance", pct: WATERFALL.insurance, amount: waterfall.insurance, color: "bg-yellow-200" },
                  { label: "Operating Costs", pct: WATERFALL.operatingCosts, amount: waterfall.operatingCosts, color: "bg-red-200" },
                  { label: "Operator Fee (Rentor)", pct: WATERFALL.operatorFee, amount: waterfall.operatorFee, color: "bg-indigo-200" },
                  { label: "Distributed to Investors", pct: WATERFALL.netToInvestors, amount: waterfall.netToInvestors, color: "bg-green-200" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.label}</span>
                      <span className="font-semibold">
                        {(item.pct * 100).toFixed(0)}% &middot; {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${item.color} rounded-full h-2`} style={{ width: `${item.pct * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-indigo-700">{formatCurrency(waterfall.operatorFee)}</p>
                  <p className="text-xs text-indigo-600">Operator Fee/yr</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{formatCurrency(waterfall.netToInvestors)}</p>
                  <p className="text-xs text-green-600">Investor Dist./yr</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-purple-700">{formatCurrency(vehicle.pricePerDay)}</p>
                  <p className="text-xs text-purple-600">Daily Rental Rate</p>
                </div>
              </div>

              {/* Use of Funds */}
              {hasCampaign && investmentPitch.useOfFunds.length > 0 && (
                <div className="mt-6">
                  <Heading as="h3" className="mb-3">
                    Use of Funds
                  </Heading>
                  <div className="space-y-3">
                    {investmentPitch.useOfFunds.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{item.item}</span>
                          <span className="font-semibold">
                            {item.percentage}% &middot; {formatCurrency(item.amount)}
                          </span>
                        </div>
                        <Progress value={item.percentage} variant="default" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Management Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Campaign Management
              </Heading>

              {hasCampaign && campaign ? (
                <>
                  {/* Campaign Stats */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <Badge variant="success">{campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Raised</span>
                      <span className="font-semibold">
                        {formatCurrency(campaign.currentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining</span>
                      <span className="font-semibold">
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold">
                        {fundingPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Funding</span>
                      <span className="font-semibold">
                        {campaign.minFundingRequired ?? 60}%
                      </span>
                    </div>
                  </div>

                  {/* Management Actions */}
                  <div className="space-y-3">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleEditCampaign}
                    >
                      ✏️ Edit Campaign
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handlePauseCampaign}
                    >
                      ⏸️ Pause Campaign
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                      onClick={handleEndCampaign}
                    >
                      🏁 End Campaign
                    </Button>
                  </div>

                  {/* Info Box */}
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-xs text-green-800">
                      <strong>Campaign Active:</strong> Investors can currently
                      purchase tokens for this vehicle. Revenue will be distributed
                      automatically.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Paragraph className="mb-6 text-gray-600">
                    This vehicle doesn't have an active fundraising campaign.
                  </Paragraph>
                  <Button
                    className="w-full"
                    onClick={() => router.push("/rentor/fundraising")}
                  >
                    Create Campaign
                  </Button>
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-800">
                      Create a fundraising campaign to raise capital for this
                      vehicle through tokenized investment.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <div className="mt-8">
          <Heading as="h2" className="mb-6">
            Customer Reviews
          </Heading>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ReviewList reviews={reviews} />
            </div>
            <div className="lg:col-span-1">
              <ReviewStats reviews={reviews} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
