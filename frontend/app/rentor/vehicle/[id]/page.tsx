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
} from "@/src/components/ui";
import { ReviewList, ReviewStats } from "@/src/components/shared";
import { generateMockVehicles, generateMockReviews } from "@/src/lib/mockData";
import { Vehicle, Review } from "@/src/types";
import { formatCurrency } from "@/src/lib/utils";
import Image from "next/image";
import { toast } from "react-hot-toast";

export default function RentorVehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const loadVehicle = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find vehicle from mock data
      const mockVehicles = generateMockVehicles(20);
      const foundVehicle = mockVehicles.find((v) => v._id === vehicleId);

      if (foundVehicle) {
        setVehicle(foundVehicle);

        // Load reviews for this vehicle
        const mockReviews = generateMockReviews(20);
        const vehicleReviews = mockReviews.filter((r) => r.vehicle === foundVehicle._id);
        setReviews(vehicleReviews);
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
    // TODO: Open edit modal or navigate to edit page
  };

  const handlePauseCampaign = () => {
    toast("Campaign paused successfully!", {
      duration: 3000,
      icon: "⏸️",
    });
    // TODO: Implement pause campaign logic
  };

  const handleEndCampaign = () => {
    toast("Campaign ended successfully!", {
      duration: 3000,
      icon: "🏁",
    });
    // TODO: Implement end campaign logic
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
  const hasCampaign = fundraising?.active;
  const fundingPercentage = hasCampaign
    ? (fundraising.currentAmount / fundraising.targetAmount) * 100
    : 0;
  const remainingAmount = hasCampaign
    ? fundraising.targetAmount - fundraising.currentAmount
    : 0;
  const daysLeft = Math.floor(Math.random() * 60) + 10;

  // Mock investor data
  const mockInvestors = fundraising?.investors?.length
    ? Array.from({ length: fundraising.investors.length }, (_, i) => ({
        id: `inv-${i}`,
        name: `Investor ${i + 1}`,
        walletAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        amount: Math.floor(Math.random() * 5000) + 500,
        tokens: Math.floor(Math.random() * 100) + 10,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      }))
    : [];

  // Mock financial data
  const financials = {
    estimatedAnnualRevenue: vehicle.pricePerDay * 200,
    operatingCosts: vehicle.pricePerDay * 200 * 0.3,
    netIncome: vehicle.pricePerDay * 200 * 0.7,
    returnOnInvestment: fundraising?.expectedROI || 0,
  };

  // Mock investment pitch (same as investor page)
  const investmentPitch = {
    overview: `Invest in this ${vehicle.year} ${vehicle.brand} ${vehicle.model}, a premium ${vehicle.category} available for rental in ${vehicle.location}. This vehicle represents a unique opportunity to earn passive income through the sharing economy.`,
    whyInvest: [
      `High-demand ${vehicle.category} in ${vehicle.location}'s competitive rental market`,
      `Premium ${vehicle.brand} brand with strong resale value`,
      `Competitive daily rate of ${formatCurrency(vehicle.pricePerDay)}`,
      `Professional maintenance and insurance coverage included`,
      `Transparent blockchain-based revenue distribution`,
    ],
    useOfFunds: fundraising ? [
      { item: "Vehicle Acquisition", percentage: 70, amount: fundraising.targetAmount * 0.7 },
      { item: "Insurance & Registration", percentage: 10, amount: fundraising.targetAmount * 0.1 },
      { item: "Initial Maintenance", percentage: 10, amount: fundraising.targetAmount * 0.1 },
      { item: "Platform Fees", percentage: 5, amount: fundraising.targetAmount * 0.05 },
      { item: "Reserve Fund", percentage: 5, amount: fundraising.targetAmount * 0.05 },
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
                {hasCampaign && (
                  <>
                    <Badge variant="default" className="shadow-lg">
                      {fundingPercentage.toFixed(0)}% Funded
                    </Badge>
                    <Badge variant="success" className="shadow-lg">
                      {fundraising.expectedROI}% ROI
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
                    <span>⛽ {vehicle.fuelType}</span>
                    <span>👥 {vehicle.seatingCapacity} seats</span>
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
          {hasCampaign && (
            <Card>
              <CardContent className="p-6">
                <Heading as="h2" className="mb-4">
                  Campaign Performance
                </Heading>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Raised</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(fundraising.currentAmount)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      of {formatCurrency(fundraising.targetAmount)} goal
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Investors</p>
                    <p className="text-2xl font-bold text-green-600">
                      {mockInvestors.length}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Active token holders
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Expected ROI</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {fundraising.expectedROI}%
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
          {hasCampaign && mockInvestors.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <Heading as="h2" className="mb-4">
                  Investors ({mockInvestors.length})
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
                          Tokens
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockInvestors.map((investor) => (
                        <tr key={investor.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{investor.name}</p>
                              <p className="text-xs text-gray-500">
                                {investor.walletAddress.slice(0, 6)}...
                                {investor.walletAddress.slice(-4)}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            {formatCurrency(investor.amount)}
                          </td>
                          <td className="py-3 px-4">{investor.tokens} RST</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {investor.date.toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Projections */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Financial Overview
              </Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">
                    Estimated Annual Revenue
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(financials.estimatedAnnualRevenue)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Operating Costs (30%)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(financials.operatingCosts)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Net Annual Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(financials.netIncome)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Daily Rental Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(vehicle.pricePerDay)}
                  </p>
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
                            {item.percentage}% · {formatCurrency(item.amount)}
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

              {hasCampaign ? (
                <>
                  {/* Campaign Stats */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Raised</span>
                      <span className="font-semibold">
                        {formatCurrency(fundraising.currentAmount)}
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
