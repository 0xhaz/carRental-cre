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
  Input,
  Separator,
} from "@/components/ui";
import { ReviewList, ReviewStats } from "@/components/shared";
import { Vehicle, Review, FundraisingCampaign, Investment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { rentorApi, reviewApi, vehicleApi, investmentApi } from "@/lib/api";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useVehicleNFT } from "@/hooks/useContracts";
import { parseGwei, decodeEventLog } from "viem";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

export default function RentorVehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [campaign, setCampaign] = useState<FundraisingCampaign | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSavingNftId, setIsSavingNftId] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    targetAmount: 0,
    expectedROI: 0,
    duration: 0,
    minInvestment: 0,
    minFundingRequired: 60,
  });

  // On-chain vehicle registration
  const { address: walletAddress } = useAccount();
  const vehicleNFT = useVehicleNFT();
  const {
    data: mintHash,
    writeContract: writeMintVehicle,
    error: mintError,
    isPending: isMinting,
  } = useWriteContract();
  const {
    isLoading: isMintConfirming,
    isSuccess: mintSuccess,
    data: mintReceipt,
  } = useWaitForTransactionReceipt({ hash: mintHash });

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

  const isVehicleRegistered = !!(vehicle?.vehicleNftId !== undefined && vehicle?.vehicleNftId !== null);

  // After mint confirmed, parse tokenId from Transfer event and save to backend
  useEffect(() => {
    if (!mintSuccess || !mintReceipt || !vehicle) return;

    const saveTokenId = async () => {
      try {
        const transferLog = mintReceipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: [{ type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] }],
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === "Transfer";
          } catch {
            return false;
          }
        });

        if (!transferLog) {
          toast.error("Could not parse tokenId from transaction");
          return;
        }

        const decoded = decodeEventLog({
          abi: [{ type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] }],
          data: transferLog.data,
          topics: transferLog.topics,
        });

        const tokenId = Number((decoded.args as any).tokenId);

        setIsSavingNftId(true);
        await vehicleApi.setVehicleNftId(vehicle._id, tokenId, walletAddress || "");
        toast.success(`Vehicle registered on-chain! Token ID: ${tokenId}`);
        // Refresh vehicle data
        setVehicle((prev) => prev ? { ...prev, vehicleNftId: tokenId, ownerAddress: walletAddress || "" } : prev);
      } catch (error: any) {
        console.error("Save NFT ID error:", error);
        toast.error(error.response?.data?.message || "Failed to save token ID");
      } finally {
        setIsSavingNftId(false);
      }
    };

    saveTokenId();
  }, [mintSuccess, mintReceipt]);

  useEffect(() => {
    if (mintError) {
      console.error("Mint vehicle error:", mintError);
      toast.error(mintError.message?.slice(0, 100) || "Failed to mint vehicle NFT");
    }
  }, [mintError]);

  const handleRegisterOnChain = () => {
    if (!vehicle || !walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    const vin = vehicle.vin || `VIN-${vehicle._id.slice(-8).toUpperCase()}`;
    const oneYearFromNow = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

    writeMintVehicle({
      address: vehicleNFT.address,
      abi: vehicleNFT.abi,
      functionName: "mintVehicle",
      args: [
        walletAddress,
        {
          vin,
          make: vehicle.brand,
          model: vehicle.model,
          year: BigInt(vehicle.year),
          color: vehicle.color || "Unknown",
          mileage: BigInt(vehicle.mileage || 0),
          registrationExpiry: oneYearFromNow,
          insuranceExpiry: oneYearFromNow,
        },
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000001",
      ],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const handleEditCampaign = () => {
    if (!campaign) return;
    setEditForm({
      targetAmount: campaign.targetAmount,
      expectedROI: campaign.expectedROI,
      duration: campaign.duration,
      minInvestment: campaign.minInvestment,
      minFundingRequired: campaign.minFundingRequired ?? 60,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!campaign) return;
    setIsActionLoading(true);
    try {
      const res = await investmentApi.updateCampaign(campaign._id, editForm);
      if (res.success) {
        toast.success("Campaign updated successfully");
        setCampaign(res.data);
        setShowEditModal(false);
      } else {
        toast.error(res.message || "Failed to update campaign");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update campaign");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseCampaign = async () => {
    if (!campaign) return;
    setIsActionLoading(true);
    try {
      const res = await investmentApi.pauseCampaign(campaign._id);
      if (res.success) {
        toast.success(res.message);
        setCampaign(res.data);
      } else {
        toast.error(res.message || "Failed to pause campaign");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to pause campaign");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEndCampaign = async () => {
    if (!campaign) return;
    setIsActionLoading(true);
    try {
      const res = await investmentApi.cancelCampaign(campaign._id);
      if (res.success) {
        toast.success(res.message || "Campaign ended and investors refunded");
        setCampaign((prev) => prev ? { ...prev, status: "cancelled" as any, currentAmount: 0 } : prev);
        setShowEndConfirm(false);
      } else {
        toast.error(res.message || "Failed to end campaign");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to end campaign");
    } finally {
      setIsActionLoading(false);
    }
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
  const hasCampaign = campaign && ["active", "funded", "draft", "paused"].includes(campaign.status);
  const isPaused = campaign?.status === "paused";
  const canEditCampaign = campaign && ["active", "paused", "draft"].includes(campaign.status);
  const canEndCampaign = campaign && campaign.status !== "funded" && campaign.status !== "cancelled";
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
                      <Badge variant={isPaused ? "warning" : "success"}>{campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}</Badge>
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
                    {canEditCampaign && (
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={handleEditCampaign}
                        disabled={isActionLoading}
                      >
                        Edit Campaign
                      </Button>
                    )}
                    {(campaign.status === "active" || campaign.status === "paused") && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handlePauseCampaign}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? "Processing..." : isPaused ? "Resume Campaign" : "Pause Campaign"}
                      </Button>
                    )}
                    {canEndCampaign && !showEndConfirm && (
                      <Button
                        variant="outline"
                        className="w-full text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => setShowEndConfirm(true)}
                        disabled={isActionLoading}
                      >
                        End Campaign
                      </Button>
                    )}

                    {/* End Campaign Confirmation */}
                    {showEndConfirm && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                        <p className="text-sm font-semibold text-red-800">Are you sure?</p>
                        <p className="text-xs text-red-600">
                          This will permanently end the campaign.
                          {campaign.currentAmount > 0 && (
                            <span className="block mt-1 font-medium">
                              All {formatCurrency(campaign.currentAmount)} in investments will be refunded to investors.
                            </span>
                          )}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleEndCampaign}
                            disabled={isActionLoading}
                            className="flex-1 bg-red-600! hover:bg-red-700! text-white!"
                          >
                            {isActionLoading ? "Ending..." : campaign.currentAmount > 0 ? "End & Refund" : "End Campaign"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setShowEndConfirm(false)}
                            disabled={isActionLoading}
                            className="flex-1"
                          >
                            Keep
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className={`mt-6 ${isPaused ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"} border rounded-lg p-4`}>
                    <p className={`text-xs ${isPaused ? "text-yellow-800" : "text-green-800"}`}>
                      {isPaused ? (
                        <><strong>Campaign Paused:</strong> New investments are temporarily disabled. Resume the campaign to accept investments again.</>
                      ) : (
                        <><strong>Campaign Active:</strong> Investors can currently purchase tokens for this vehicle. Revenue will be distributed automatically.</>
                      )}
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

          {/* Blockchain Registration */}
          <Card className="mt-4">
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Blockchain Registration
              </Heading>
              {isVehicleRegistered ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-sm text-green-700 font-medium">
                    Registered on-chain (Token ID: {vehicle.vehicleNftId})
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Register this vehicle as an NFT on-chain to enable investor participation.
                  </p>
                  <Button
                    onClick={handleRegisterOnChain}
                    disabled={isMinting || isMintConfirming || isSavingNftId || !walletAddress}
                    className="w-full"
                  >
                    {isMinting
                      ? "Confirm in Wallet..."
                      : isMintConfirming
                      ? "Confirming Transaction..."
                      : isSavingNftId
                      ? "Saving Token ID..."
                      : !walletAddress
                      ? "Connect Wallet First"
                      : "Register Vehicle On-Chain"}
                  </Button>
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

      {/* Edit Campaign Modal */}
      {showEditModal && campaign && (
        <div
          onClick={() => !isActionLoading && setShowEditModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <Heading as="h2">Edit Campaign</Heading>
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={isActionLoading}
                  className="text-gray-500 hover:text-gray-800"
                  aria-label="Close"
                >
                  &#10005;
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  type="number"
                  label="Target Amount ($)"
                  value={editForm.targetAmount}
                  onChange={(e) => setEditForm((f) => ({ ...f, targetAmount: Number(e.target.value) }))}
                  min={campaign.currentAmount || 0}
                />

                <Input
                  type="number"
                  label="Expected ROI (%)"
                  value={editForm.expectedROI}
                  onChange={(e) => setEditForm((f) => ({ ...f, expectedROI: Number(e.target.value) }))}
                  min={0}
                  step="0.1"
                />

                <Input
                  type="number"
                  label="Duration (days)"
                  value={editForm.duration}
                  onChange={(e) => setEditForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                  min={1}
                />

                <Input
                  type="number"
                  label="Minimum Investment ($)"
                  value={editForm.minInvestment}
                  onChange={(e) => setEditForm((f) => ({ ...f, minInvestment: Number(e.target.value) }))}
                  min={0}
                />

                <Input
                  type="number"
                  label="Minimum Funding Required (%)"
                  value={editForm.minFundingRequired}
                  onChange={(e) => setEditForm((f) => ({ ...f, minFundingRequired: Number(e.target.value) }))}
                  min={0}
                  max={100}
                />

                {campaign.currentAmount > 0 && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                    Target amount cannot be less than {formatCurrency(campaign.currentAmount)} (already raised).
                  </p>
                )}
              </div>

              <Separator className="my-6" />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={isActionLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isActionLoading}
                  className="flex-1"
                >
                  {isActionLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
