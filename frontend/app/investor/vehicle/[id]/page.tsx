"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { InvestmentModal } from "@/components/investor";
import { ReviewList, ReviewStats } from "@/components/shared";
import {
  Heading,
  Paragraph,
  Button,
  Card,
  CardContent,
  Badge,
  Progress,
} from "@/components/ui";
import { Vehicle, Review, FundraisingCampaign } from "@/types";
import { investmentApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useEthPrice, useEthToUsd } from "@/hooks/usePriceFeed";
import { useVehiclePayments, useVehicleInvestmentTotal, useRentorCoInvestment } from "@/hooks/useInvestment";
import { formatEther } from "viem";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { ExplorerLink } from "@/components/web3";
import { useWatchCampaignReports } from "@/hooks/useCRE";

// Revenue waterfall percentages from RevenueDistributor.sol
const WATERFALL = {
  platformFee: 0.15,
  maintenance: 0.10,
  insurance: 0.05,
  operatingCosts: 0.10,
  operatorFee: 0.10,
  netToInvestors: 0.50,
} as const;

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [campaign, setCampaign] = useState<FundraisingCampaign | null>(null);
  const [investorCount, setInvestorCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await investmentApi.getVehiclePitch(vehicleId);
      if (res.success) {
        setVehicle(res.data.vehicle);
        setCampaign(res.data.campaign);
        setInvestorCount(res.data.investorCount);
        setReviews(res.data.reviews || []);
      }
    } catch {
      // Vehicle not found
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [vehicleId]);

  const { price: ethPrice } = useEthPrice();

  // On-chain campaign totals (source of truth from smart contract)
  const vehicleTokenId = vehicle?.vehicleNftId != null ? BigInt(vehicle.vehicleNftId) : undefined;
  const { data: vehicleInvestmentTotalWei } = useVehicleInvestmentTotal(vehicleTokenId);
  const { data: onChainCoInvestment } = useRentorCoInvestment(vehicleTokenId);
  const { data: vehiclePaymentIds } = useVehiclePayments(vehicleTokenId);
  const onChainPayments = vehiclePaymentIds as bigint[] | undefined;
  const onChainInvestorCount = onChainPayments?.length ?? 0;

  // Prefer vehicleInvestmentTotal (includes all), fallback to co-investment only
  const investmentTotalEth = vehicleInvestmentTotalWei
    ? parseFloat(formatEther(vehicleInvestmentTotalWei as bigint))
    : 0;
  const coInvestEth = onChainCoInvestment
    ? parseFloat(formatEther(onChainCoInvestment as bigint))
    : 0;
  const totalRaisedEth = investmentTotalEth > 0 ? investmentTotalEth : coInvestEth;
  const totalRaisedUsd = totalRaisedEth * ethPrice;

  const campaignCREEvents = useWatchCampaignReports();

  const handleInvestmentSuccess = (amount: number) => {
    toast.success(`Successfully invested ${amount.toFixed(4)} ETH!`);
    loadData(); // Refresh data
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
            This investment opportunity is no longer available or doesn't exist.
          </Paragraph>
          <Button onClick={() => router.push("/investor/marketplace")}>
            Back to Marketplace
          </Button>
        </Card>
      </div>
    );
  }

  // Build a vehicle object with fundraising for the InvestmentModal
  const vehicleWithFundraising: Vehicle = {
    ...vehicle,
    fundraising: campaign ? {
      active: true,
      campaignId: campaign._id,
      targetAmount: campaign.targetAmount,
      currentAmount: totalRaisedUsd > 0 ? totalRaisedUsd : campaign.currentAmount,
      minInvestment: campaign.minInvestment,
      maxInvestment: campaign.maxInvestment,
      expectedROI: campaign.expectedROI,
      investorCount: Math.max(investorCount, onChainInvestorCount),
      investors: vehicle.fundraising?.investors ?? [],
    } : vehicle.fundraising,
  };

  const fundraising = vehicleWithFundraising.fundraising;
  const hasCampaign = campaign && ["active", "funded"].includes(campaign.status);

  const effectiveRaised = totalRaisedUsd > 0 ? totalRaisedUsd : (campaign?.currentAmount ?? 0);
  const fundingPercentage = hasCampaign
    ? Math.min((effectiveRaised / campaign.targetAmount) * 100, 100)
    : 0;
  const remainingAmount = hasCampaign
    ? Math.max(campaign.targetAmount - effectiveRaised, 0)
    : 0;
  const daysLeft = hasCampaign && campaign.endDate
    ? Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Revenue waterfall (assume 70% occupancy)
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
  const investmentPitch = {
    overview: `Invest in this ${vehicle.year} ${vehicle.brand} ${vehicle.model}, a premium ${vehicle.category} available for rental in ${vehicle.location}. This vehicle represents a unique opportunity to earn passive income through the sharing economy.`,
    whyInvest: [
      `High-demand ${vehicle.category} in ${vehicle.location}'s competitive rental market`,
      `Premium ${vehicle.brand} brand with strong resale value`,
      `Competitive daily rate of ${formatCurrency(vehicle.pricePerDay)}`,
      `Professional maintenance and insurance coverage included`,
      `Transparent blockchain-based revenue distribution`,
    ],
    useOfFunds: hasCampaign ? [
      { item: "Vehicle Acquisition", percentage: 70, amount: campaign.targetAmount * 0.7 },
      { item: "Insurance & Registration", percentage: 10, amount: campaign.targetAmount * 0.1 },
      { item: "Initial Maintenance", percentage: 10, amount: campaign.targetAmount * 0.1 },
      { item: "Platform Fees", percentage: 5, amount: campaign.targetAmount * 0.05 },
      { item: "Reserve Fund", percentage: 5, amount: campaign.targetAmount * 0.05 },
    ] : [],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/investor/marketplace")}
        className="mb-6"
      >
        ← Back to Marketplace
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
                      {campaign.expectedROI}% ROI
                    </Badge>
                  </>
                )}
              </div>
            </div>
            <CardContent className="p-6">
              <Heading as="h1" className="mb-2">
                {vehicle.brand} {vehicle.model} ({vehicle.year})
              </Heading>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                <span>📍 {vehicle.location}</span>
                <span>🚗 {vehicle.category}</span>
                <span>⛽ {vehicle.fuel_type}</span>
                <span>👥 {vehicle.seating_capacity} seats</span>
                <span>⚙️ {vehicle.transmission}</span>
              </div>
              <Paragraph className="text-lg">{vehicle.description}</Paragraph>
            </CardContent>
          </Card>

          {/* Investment Pitch */}
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
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{formatCurrency(waterfall.netToInvestors)}</p>
                  <p className="text-xs text-green-600">Your Share/yr (50%)</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-purple-700">{campaign?.expectedROI || fundraising?.expectedROI || 0}%</p>
                  <p className="text-xs text-purple-600">Expected ROI</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(vehicle.pricePerDay)}</p>
                  <p className="text-xs text-blue-600">Daily Rental Rate</p>
                </div>
              </div>

              {/* Use of Funds */}
              {investmentPitch.useOfFunds.length > 0 && (
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

        {/* Sidebar - Investment Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Investment Details
              </Heading>

              {/* Live ETH Price */}
              {ethPrice > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-gray-600">ETH/USD</span>
                  <span className="font-semibold text-gray-900">
                    ${ethPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {hasCampaign ? (
                <>
                  {/* Funding Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold">Funding Progress</span>
                      <span>{fundingPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={fundingPercentage} variant="default" className="mb-2" />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>
                        {formatCurrency(effectiveRaised)} raised
                        {totalRaisedEth > 0 && (
                          <span className="text-xs ml-1">({totalRaisedEth.toFixed(4)} ETH)</span>
                        )}
                      </span>
                      <span>Goal: {formatCurrency(campaign.targetAmount)}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining</span>
                      <span className="font-semibold">{formatCurrency(remainingAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Investors</span>
                      <span className="font-semibold">{Math.max(investorCount, onChainInvestorCount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min. Investment</span>
                      <span className="font-semibold">{formatCurrency(campaign.minInvestment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Days Left</span>
                      <span className="font-semibold">{daysLeft > 0 ? `${daysLeft} days` : "Ending soon"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Rate</span>
                      <span className="font-semibold">
                        {formatCurrency(vehicle.pricePerDay)}/day
                      </span>
                    </div>
                  </div>

                  {/* Investment Button */}
                  <Button
                    className="w-full mb-4"
                    size="lg"
                    onClick={() => setShowInvestmentModal(true)}
                  >
                    Invest Now
                  </Button>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-800">
                      <strong>Secure Investment:</strong> All investments are backed by
                      blockchain technology with transparent revenue distribution.
                    </p>
                  </div>

                  {/* CRE Campaign Health Alert */}
                  {vehicle.vehicleNftId && (() => {
                    const vehicleEvents = campaignCREEvents.filter(
                      (e) => e.vehicleId.toString() === vehicle.vehicleNftId?.toString(),
                    );
                    if (vehicleEvents.length === 0) return null;
                    const latestEvent = vehicleEvents[0];
                    const isFailed = latestEvent.action === "CAMPAIGN_FAILED";
                    return (
                      <div className={`mt-4 border rounded-lg p-4 ${isFailed ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <svg
                            className={`w-4 h-4 ${isFailed ? "text-red-600" : "text-orange-600"}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <span className={`text-xs font-semibold ${isFailed ? "text-red-800" : "text-orange-800"}`}>
                            {isFailed ? "Campaign Failed" : "Campaign Cancelled"}
                          </span>
                        </div>
                        <p className={`text-xs ${isFailed ? "text-red-700" : "text-orange-700"}`}>
                          {isFailed
                            ? "This campaign did not reach its funding target. Batch refunds have been processed."
                            : "This campaign has been cancelled. Batch refunds have been processed."}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className={isFailed ? "text-red-500" : "text-orange-500"}>
                            {Number(latestEvent.refundedCount)} refunded
                          </span>
                          <ExplorerLink value={latestEvent.transactionHash} type="tx" className="text-xs" />
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center py-4">
                  <Paragraph className="text-gray-600">
                    No active campaign for this vehicle.
                  </Paragraph>
                </div>
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

      {/* Investment Modal */}
      {showInvestmentModal && fundraising && (
        <InvestmentModal
          vehicle={vehicleWithFundraising}
          onClose={() => setShowInvestmentModal(false)}
          onSuccess={handleInvestmentSuccess}
        />
      )}
    </div>
  );
}
