"use client";

import { useState, useEffect } from "react";
import { Card, Button, Badge, Progress } from "@/components/ui";
import { toast } from "react-hot-toast";
import { FundraisingCampaign, Vehicle } from "@/types";
import { investmentApi, vehicleApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useVehicleNFT } from "@/hooks/useContracts";
import { parseGwei, decodeEventLog } from "viem";

// Revenue waterfall percentages from RevenueDistributor.sol
// Insurance (5%) + Operating (10%) + Operator (10%) = 25% total → withdrawable by rentor
const WATERFALL = {
  platformFee: 0.15,
  maintenance: 0.10,
  insurance: 0.05,       // Rentor responsibility
  operatingCosts: 0.10,  // Rentor responsibility
  operatorFee: 0.10,     // Rentor responsibility
  netToInvestors: 0.50,
} as const;

export interface ManageCampaignModalProps {
  campaign: FundraisingCampaign;
  vehicle?: Vehicle;
  onClose: () => void;
  onCampaignUpdated?: () => void;
}

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

export function ManageCampaignModal({ campaign, vehicle, onClose, onCampaignUpdated }: ManageCampaignModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isSavingNftId, setIsSavingNftId] = useState(false);
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);

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

  const effectiveTokenId = mintedTokenId ?? vehicle?.vehicleNftId ?? null;
  const isVehicleRegistered = effectiveTokenId !== null && effectiveTokenId !== undefined;

  // After mint confirmed, parse tokenId from Transfer event and save to backend
  useEffect(() => {
    if (!mintSuccess || !mintReceipt || !vehicle) return;

    const saveTokenId = async () => {
      try {
        // Parse Transfer event (ERC-721): Transfer(address from, address to, uint256 tokenId)
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
        setMintedTokenId(tokenId);
        toast.success(`Vehicle registered on-chain! Token ID: ${tokenId}`);
        onCampaignUpdated?.();
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
        "0x0000000000000000000000000000000000000001", // assetToken placeholder (contract requires non-zero)
        "0x0000000000000000000000000000000000000001", // revenueToken placeholder (contract requires non-zero)
      ],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const fundingPercentage = campaign.targetAmount > 0
    ? (campaign.currentAmount / campaign.targetAmount) * 100
    : 0;
  const remainingAmount = campaign.targetAmount - campaign.currentAmount;
  const minFundingPct = campaign.minFundingRequired ?? 60;
  const minFundingAmount = campaign.targetAmount * (minFundingPct / 100);
  const meetsMinFunding = campaign.currentAmount >= minFundingAmount;
  const canCancel = campaign.status !== "funded" && campaign.status !== "cancelled";

  // Calculate days remaining
  const daysRemaining = campaign.endDate
    ? Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Revenue projections (if vehicle data available)
  const projections = vehicle ? (() => {
    const grossAnnual = vehicle.pricePerDay * 365 * 0.7; // assume 70% occupancy
    const operatorFee = grossAnnual * WATERFALL.operatorFee;
    const netToInvestors = grossAnnual * WATERFALL.netToInvestors;
    const rentorShare = campaign.fundraisingType === "co_invest" && campaign.rentorInvestment > 0
      ? campaign.rentorInvestment / campaign.targetAmount
      : 0;
    const rentorTokenIncome = netToInvestors * rentorShare;
    const rentorTotalIncome = operatorFee + rentorTokenIncome;

    return { grossAnnual, operatorFee, netToInvestors, rentorShare, rentorTokenIncome, rentorTotalIncome };
  })() : null;

  const handleCancelCampaign = async () => {
    setIsLoading(true);
    try {
      const response = await investmentApi.cancelCampaign(campaign._id);
      if (response.success) {
        toast.success("Campaign cancelled successfully");
        onCampaignUpdated?.();
        onClose();
      } else {
        toast.error(response.message || "Failed to cancel campaign");
      }
    } catch (error: any) {
      console.error("Cancel campaign error:", error);
      toast.error(error.response?.data?.message || "Failed to cancel campaign");
    } finally {
      setIsLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isLoading) onClose();
  };

  const statusColor = {
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    funded: "bg-blue-100 text-blue-700",
    closed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
  }[campaign.status] || "bg-gray-100 text-gray-700";

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl my-8 p-8 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center mb-1">
          Manage <span className="text-blue-600">Campaign</span>
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          View and manage your fundraising campaign
        </p>

        {/* Vehicle Header */}
        {vehicle && (
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <img
              src={vehicle.image || "/assets/car_image1.png"}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-sm text-gray-600">
                {vehicle.year} · {vehicle.category} · {vehicle.location}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                ${vehicle.pricePerDay}/day rental rate
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColor}`}>
              {campaign.status}
            </span>
          </div>
        )}

        {/* Funding Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Funding Progress</span>
            <span className="font-semibold">
              {formatCurrency(campaign.currentAmount)} / {formatCurrency(campaign.targetAmount)}
            </span>
          </div>
          <div className="relative">
            <Progress value={fundingPercentage} variant="default" />
            {/* Min funding threshold marker */}
            {minFundingPct > 0 && minFundingPct < 100 && (
              <div
                className="absolute top-0 h-full w-0.5 bg-yellow-500"
                style={{ left: `${minFundingPct}%` }}
                title={`Min funding: ${minFundingPct}%`}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{fundingPercentage.toFixed(1)}% funded</span>
            <span>{formatCurrency(remainingAmount)} remaining</span>
          </div>
          {/* Min funding threshold info */}
          <div className={`mt-2 px-3 py-1.5 rounded-md text-xs ${meetsMinFunding ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
            {meetsMinFunding ? (
              <span>Minimum funding threshold met ({minFundingPct}% = {formatCurrency(minFundingAmount)})</span>
            ) : (
              <span>Needs {formatCurrency(minFundingAmount - campaign.currentAmount)} more to reach minimum threshold ({minFundingPct}% = {formatCurrency(minFundingAmount)})</span>
            )}
          </div>
        </div>

        {/* Campaign Details Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Expected ROI</p>
            <p className="text-xl font-bold text-green-600">{campaign.expectedROI}%</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Min Investment</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(campaign.minInvestment)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Min Funding</p>
            <p className={`text-xl font-bold ${meetsMinFunding ? "text-green-600" : "text-yellow-600"}`}>{minFundingPct}%</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Duration</p>
            <p className="text-xl font-bold text-gray-900">{campaign.duration} days</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Days Remaining</p>
            <p className={`text-xl font-bold ${daysRemaining !== null && daysRemaining <= 7 ? "text-red-600" : "text-gray-900"}`}>
              {daysRemaining !== null ? `${daysRemaining} days` : "--"}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Investors</p>
            <p className="text-xl font-bold text-gray-900">{(campaign as any).investorCount ?? "--"}</p>
          </div>
        </div>

        {/* Fundraising Type */}
        <div className="mb-6 p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Fundraising Type</p>
          {campaign.fundraisingType === "co_invest" ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">$</span>
                <span className="text-sm font-semibold text-indigo-800">Co-Invest</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                You are co-investing alongside external investors and earn both operator fee and token distributions.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Your Investment: </span>
                  <span className="font-semibold text-indigo-700">{formatCurrency(campaign.rentorInvestment)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Token Share: </span>
                  <span className="font-semibold text-indigo-700">
                    {campaign.targetAmount > 0 ? ((campaign.rentorInvestment / campaign.targetAmount) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">%</span>
                <span className="text-sm font-semibold text-purple-800">No Capital (Full Fundraise)</span>
              </div>
              <p className="text-xs text-gray-600">
                100% funded by external investors. You earn the 10% operator fee from revenue.
              </p>
            </div>
          )}
        </div>

        {/* Revenue Projection */}
        {projections && (
          <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 space-y-2">
            <p className="text-xs text-blue-800 uppercase tracking-wide font-semibold">Revenue Projection (est. 70% occupancy)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-800">${fmt(projections.operatorFee)}</p>
                <p className="text-xs text-blue-600">Operator Fee/yr</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-700">${fmt(projections.netToInvestors)}</p>
                <p className="text-xs text-green-600">Investor Dist./yr</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${campaign.fundraisingType === "co_invest" ? "text-indigo-800" : "text-blue-800"}`}>
                  ${fmt(projections.rentorTotalIncome)}
                </p>
                <p className="text-xs text-gray-600">Your Income/yr</p>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Dates */}
        <div className="mb-6 p-4 rounded-lg border border-gray-200 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Timeline</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Start Date: </span>
              <span className="font-medium">
                {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : "--"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">End Date: </span>
              <span className="font-medium">
                {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : "--"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Created: </span>
              <span className="font-medium">
                {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Last Updated: </span>
              <span className="font-medium">
                {new Date(campaign.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* On-Chain Registration */}
        <div className="mb-6 p-4 rounded-lg border border-gray-200 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Blockchain Registration</p>
          {isVehicleRegistered ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Vehicle Registered On-Chain</p>
                  <p className="text-xs text-green-600">NFT Token ID: #{effectiveTokenId}</p>
                </div>
                {mintedTokenId && (
                  <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs font-medium rounded-full">
                    Just minted
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">
                Register this vehicle as an NFT on-chain to enable investor participation. You must be an authorized operator on the VehicleNFT contract.
              </p>
              {(isMinting || isMintConfirming || isSavingNftId) && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs text-blue-700 font-medium">
                    {isMinting ? "Waiting for wallet confirmation..." : isMintConfirming ? "Transaction submitted, waiting for confirmation..." : "Saving token ID to backend..."}
                  </span>
                </div>
              )}
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
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Cancel Campaign */}
          {canCancel && !showConfirmDelete && (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              disabled={isLoading}
              className="w-full py-3 px-4 border-2 border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
            >
              Cancel Campaign
            </button>
          )}

          {/* Confirm Delete */}
          {showConfirmDelete && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Are you sure?</p>
                  <p className="text-xs text-red-600 mt-1">
                    This will permanently cancel the campaign and make the vehicle available for new fundraising.
                    {campaign.currentAmount > 0 && (
                      <span className="block mt-1 font-medium">
                        All {formatCurrency(campaign.currentAmount)} in active investments will be automatically refunded to investors.
                      </span>
                    )}
                    {" "}This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCancelCampaign}
                  isLoading={isLoading}
                  className="flex-1 bg-red-600! hover:bg-red-700! text-white!"
                >
                  {isLoading ? "Cancelling..." : campaign.currentAmount > 0 ? "Cancel & Refund Investors" : "Yes, Cancel Campaign"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Keep Campaign
                </Button>
              </div>
            </div>
          )}

          {/* Status messages */}
          {campaign.status === "funded" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-800 font-medium">
                This campaign is fully funded. It cannot be cancelled.
              </p>
            </div>
          )}

          {campaign.status === "cancelled" && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-sm text-gray-600 font-medium">
                This campaign has been cancelled.
              </p>
            </div>
          )}

          {campaign.currentAmount > 0 && campaign.status !== "funded" && campaign.status !== "cancelled" && !showConfirmDelete && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <p className="text-sm text-yellow-800 font-medium">
                Campaign has {formatCurrency(campaign.currentAmount)} raised from investors. Cancelling will automatically trigger refunds.
              </p>
            </div>
          )}

          {/* Chainlink CRE auto-cancel info */}
          {campaign.status === "active" && !meetsMinFunding && daysRemaining !== null && daysRemaining <= 7 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
              <p className="text-sm text-orange-800 font-medium">
                Minimum funding threshold not met. If not reached by deadline, Chainlink CRE will automatically cancel and refund all investors.
              </p>
            </div>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
