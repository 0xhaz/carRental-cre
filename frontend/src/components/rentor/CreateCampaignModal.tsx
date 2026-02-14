"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import { Card, Button, Input } from "@/components/ui";
import { toast } from "react-hot-toast";
import { Vehicle } from "@/types";
import { vehicleApi, investmentApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

// Revenue waterfall percentages from RevenueDistributor.sol
const WATERFALL = {
  platformFee: 0.15,
  maintenance: 0.10,
  insurance: 0.05,
  operatingCosts: 0.10,
  operatorFee: 0.10,
  netToInvestors: 0.50,
} as const;

type FundraisingType = "full_fundraise" | "co_invest";

// Info tooltip component — uses <span> instead of <button> to avoid nested button hydration errors
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1 align-middle">
      <span
        role="note"
        tabIndex={0}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-400 text-white text-[10px] font-bold hover:bg-gray-500 transition-colors leading-none cursor-help select-none"
        aria-label="More info"
      >
        i
      </span>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  );
}

export interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fundraisingType, setFundraisingType] = useState<FundraisingType>("full_fundraise");
  const [showProjection, setShowProjection] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: "",
    targetAmount: "",
    occupancyRate: "70",
    annualDepreciation: "15",
    duration: "365",
    minInvestment: "100",
    minFundingRequired: "60",
    rentorInvestment: "",
    description: "",
  });

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const response = await vehicleApi.getRentorVehicles();
        if (response.success) {
          // Filter out vehicles that already have active fundraising
          const availableVehicles = (response.data || []).filter(
            (v: Vehicle) => !v.fundraising?.active
          );
          setVehicles(availableVehicles);
          if (availableVehicles.length > 0) {
            setFormData((prev) => ({ ...prev, vehicleId: availableVehicles[0]._id }));
          }
        }
      } catch (error) {
        console.error("Failed to load vehicles:", error);
        toast.error("Failed to load vehicles");
      }
    };
    loadVehicles();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);

  // Pricing calculator: auto-calculate ROI from vehicle rental rate + waterfall
  const pricing = useMemo(() => {
    if (!selectedVehicle) return null;

    const pricePerDay = selectedVehicle.pricePerDay || 0;
    const occupancyRate = parseFloat(formData.occupancyRate) / 100 || 0;
    const targetAmount = parseFloat(formData.targetAmount) || 0;
    const durationDays = parseInt(formData.duration) || 365;

    const grossAnnualRevenue = pricePerDay * 365 * occupancyRate;

    // Waterfall breakdown
    const platformFee = grossAnnualRevenue * WATERFALL.platformFee;
    const maintenance = grossAnnualRevenue * WATERFALL.maintenance;
    const insurance = grossAnnualRevenue * WATERFALL.insurance;
    const operatingCosts = grossAnnualRevenue * WATERFALL.operatingCosts;
    const operatorFee = grossAnnualRevenue * WATERFALL.operatorFee;
    const netToInvestors = grossAnnualRevenue * WATERFALL.netToInvestors;

    // Income ROI & breakeven (rental income only)
    const incomeROI = targetAmount > 0 ? (netToInvestors / targetAmount) * 100 : 0;
    const monthlyDistribution = netToInvestors / 12;
    const breakevenMonths = monthlyDistribution > 0 ? targetAmount / monthlyDistribution : 0;

    // Pro-rated for campaign duration
    const durationYears = durationDays / 365;
    const totalDistributions = netToInvestors * durationYears;

    // Depreciation (declining balance model)
    const depRate = parseFloat(formData.annualDepreciation) / 100 || 0;
    const assetValueAtEnd = targetAmount * Math.pow(1 - depRate, durationYears);
    const depreciationLoss = targetAmount - assetValueAtEnd;

    // Net returns = distributions - depreciation loss
    const netReturn = totalDistributions - depreciationLoss;
    const netROI = targetAmount > 0 ? (netReturn / targetAmount) * 100 : 0;

    // Real breakeven
    let realBreakevenMonths = 0;
    if (monthlyDistribution > 0 && depRate > 0) {
      for (let m = 1; m <= 360; m++) {
        const cumulativeDist = monthlyDistribution * m;
        const cumulativeDep = targetAmount * (1 - Math.pow(1 - depRate, m / 12));
        if (cumulativeDist >= cumulativeDep) {
          realBreakevenMonths = m;
          break;
        }
      }
    } else if (monthlyDistribution > 0) {
      realBreakevenMonths = 1;
    }

    // Co-investment projection
    const rentorInvestAmt = fundraisingType === "co_invest" ? (parseFloat(formData.rentorInvestment) || 0) : 0;
    const rentorShare = targetAmount > 0 ? Math.min(rentorInvestAmt / targetAmount, 1) : 0;
    const rentorTokenIncome = netToInvestors * rentorShare; // Rentor's share of token distributions
    const rentorTotalIncome = operatorFee + rentorTokenIncome; // Operator fee + token income
    const externalRaised = targetAmount - rentorInvestAmt; // What external investors need to provide

    return {
      pricePerDay,
      grossAnnualRevenue,
      platformFee,
      maintenance,
      insurance,
      operatingCosts,
      operatorFee,
      netToInvestors,
      incomeROI,
      monthlyDistribution,
      breakevenMonths,
      totalDistributions,
      assetValueAtEnd,
      depreciationLoss,
      netReturn,
      netROI,
      realBreakevenMonths,
      durationYears,
      // Co-investment fields
      rentorInvestAmt,
      rentorShare,
      rentorTokenIncome,
      rentorTotalIncome,
      externalRaised,
    };
  }, [selectedVehicle, formData.occupancyRate, formData.targetAmount, formData.duration, formData.annualDepreciation, formData.rentorInvestment, fundraisingType]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (!formData.vehicleId) {
        toast.error("Please select a vehicle");
        return;
      }

      const targetAmount = parseFloat(formData.targetAmount);
      if (isNaN(targetAmount) || targetAmount <= 0) {
        toast.error("Please enter a valid target amount");
        return;
      }

      const duration = parseInt(formData.duration);
      if (isNaN(duration) || duration < 30 || duration > 1095) {
        toast.error("Duration must be between 30 and 1095 days");
        return;
      }

      const minInvestment = parseFloat(formData.minInvestment);
      if (isNaN(minInvestment) || minInvestment <= 0) {
        toast.error("Please enter a valid minimum investment");
        return;
      }

      if (!pricing || pricing.incomeROI <= 0) {
        toast.error("Please set a valid target amount and occupancy rate to calculate ROI");
        return;
      }

      // Co-investment validation
      if (fundraisingType === "co_invest") {
        const rentorInvestment = parseFloat(formData.rentorInvestment);
        if (isNaN(rentorInvestment) || rentorInvestment <= 0) {
          toast.error("Please enter your co-investment amount");
          return;
        }
        if (rentorInvestment >= targetAmount) {
          toast.error("Co-investment must be less than the target amount");
          return;
        }
      }

      const response = await investmentApi.createCampaign({
        vehicleId: formData.vehicleId,
        targetAmount,
        expectedROI: Math.round(pricing.incomeROI * 100) / 100,
        duration,
        minInvestment,
        description: formData.description,
        fundraisingType,
        rentorInvestment: fundraisingType === "co_invest" ? parseFloat(formData.rentorInvestment) || 0 : 0,
        minFundingRequired: parseInt(formData.minFundingRequired) || 60,
      });

      if (response.success) {
        const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);
        toast.success(
          `Fundraising campaign created for ${selectedVehicle?.brand} ${selectedVehicle?.model}!`
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error((response as any).message || "Failed to create campaign");
      }
    } catch (error: any) {
      console.error("Create campaign error:", error);
      toast.error(error.response?.data?.message || "Failed to create campaign. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

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
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center mb-2">
          Create <span className="text-green-600">Fundraising Campaign</span>
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Raise funds for your vehicle through tokenized investment
        </p>

        {vehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              You don&apos;t have any vehicles available for fundraising.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              All your vehicles already have active campaigns or you haven&apos;t added any vehicles yet.
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vehicle Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Vehicle *
              </label>
              <select
                name="vehicleId"
                value={formData.vehicleId}
                onChange={handleChange}
                disabled={isLoading}
                required
                className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.brand} {vehicle.model} ({vehicle.year}) - ${vehicle.pricePerDay}/day
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedVehicle.category} · {selectedVehicle.location} · {selectedVehicle.seating_capacity} seats
                </p>
              )}
            </div>

            {/* Fundraising Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fundraising Type *
                <InfoTooltip text="Choose how you want to fund this vehicle. You can raise 100% from investors (no capital needed) or co-invest your own money alongside investors for a bigger share of the revenue." />
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Full Fundraise Card */}
                <button
                  type="button"
                  onClick={() => { setFundraisingType("full_fundraise"); setFormData(prev => ({ ...prev, rentorInvestment: "" })); }}
                  disabled={isLoading}
                  className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                    fundraisingType === "full_fundraise"
                      ? "border-purple-500 bg-purple-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      fundraisingType === "full_fundraise" ? "border-purple-500" : "border-gray-300"
                    }`}>
                      {fundraisingType === "full_fundraise" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${fundraisingType === "full_fundraise" ? "text-purple-800" : "text-gray-700"}`}>
                        No Capital
                        <InfoTooltip text="You don't invest any money. 100% of the target is raised from external investors. You earn the 10% operator fee from every rental. This is ideal if you want to start a rental business with zero upfront cost." />
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        100% from investors. You earn the operator fee only.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Co-Invest Card */}
                <button
                  type="button"
                  onClick={() => setFundraisingType("co_invest")}
                  disabled={isLoading}
                  className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                    fundraisingType === "co_invest"
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      fundraisingType === "co_invest" ? "border-indigo-500" : "border-gray-300"
                    }`}>
                      {fundraisingType === "co_invest" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${fundraisingType === "co_invest" ? "text-indigo-800" : "text-gray-700"}`}>
                        Co-Invest
                        <InfoTooltip text="You invest your own capital alongside external investors. You receive revenue tokens proportional to your investment, earning both the 10% operator fee AND a share of the 50% token holder distributions. The more you invest, the bigger your total income." />
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Invest alongside. Earn operator fee + token distributions.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Campaign Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Target Amount ($)"
                type="number"
                name="targetAmount"
                placeholder="0.00"
                value={formData.targetAmount}
                onChange={handleChange}
                required
                disabled={isLoading}
                min="0"
                step="0.01"
              />
              <Input
                label="Minimum Investment ($)"
                type="number"
                name="minInvestment"
                value={formData.minInvestment}
                onChange={handleChange}
                required
                disabled={isLoading}
                min="0"
                step="0.01"
              />
            </div>

            {/* Co-Investment Amount (shown only for co_invest) */}
            {fundraisingType === "co_invest" && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-1">
                    Your Co-Investment Amount ($) *
                    <InfoTooltip text="The amount you will invest from your own capital. This gives you revenue tokens proportional to your share. You'll invest through the marketplace after the campaign is created." />
                  </label>
                  <input
                    type="number"
                    name="rentorInvestment"
                    placeholder="0.00"
                    value={formData.rentorInvestment}
                    onChange={handleChange}
                    disabled={isLoading}
                    min="0"
                    max={formData.targetAmount || undefined}
                    step="0.01"
                    className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                  />
                </div>

                {pricing && parseFloat(formData.targetAmount) > 0 && pricing.rentorInvestAmt > 0 && (
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white rounded-md p-2">
                      <p className="text-lg font-bold text-indigo-700">
                        {(pricing.rentorShare * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">Your Token Share</p>
                    </div>
                    <div className="bg-white rounded-md p-2">
                      <p className="text-lg font-bold text-gray-700">
                        ${fmt(pricing.externalRaised)}
                      </p>
                      <p className="text-xs text-gray-500">From External Investors</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Campaign Duration (days)"
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                disabled={isLoading}
                min="30"
                max="1095"
              />
              {/* Occupancy Rate Slider */}
              <div className="w-full">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Expected Occupancy Rate: <span className="text-green-600 font-bold">{formData.occupancyRate}%</span>
                </label>
                <input
                  type="range"
                  name="occupancyRate"
                  min="10"
                  max="100"
                  step="5"
                  value={formData.occupancyRate}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Depreciation Rate Slider */}
            <div className="w-full">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Annual Depreciation Rate: <span className="text-orange-600 font-bold">{formData.annualDepreciation}%</span>
              </label>
              <input
                type="range"
                name="annualDepreciation"
                min="0"
                max="30"
                step="1"
                value={formData.annualDepreciation}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0% (No depreciation)</span>
                <span>15%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Minimum Funding Threshold Slider */}
            <div className="w-full">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Minimum Funding Threshold: <span className="text-blue-600 font-bold">{formData.minFundingRequired}%</span>
                <InfoTooltip text="The minimum percentage of the target amount that must be raised before the campaign deadline. If this threshold is not met, Chainlink CRE will automatically trigger refunds to all investors. Set to 100% for all-or-nothing fundraising." />
              </label>
              <input
                type="range"
                name="minFundingRequired"
                min="0"
                max="100"
                step="5"
                value={formData.minFundingRequired}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0% (No minimum)</span>
                <span>60%</span>
                <span>100% (All-or-nothing)</span>
              </div>
              {parseFloat(formData.targetAmount) > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Campaign needs at least {formatCurrency(parseFloat(formData.targetAmount) * parseInt(formData.minFundingRequired) / 100)} of {formatCurrency(parseFloat(formData.targetAmount))} to proceed
                </p>
              )}
            </div>

            {/* Pricing Calculator - Revenue Waterfall Breakdown (Collapsible) */}
            {pricing && selectedVehicle && parseFloat(formData.targetAmount) > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Clickable Header */}
                <button
                  type="button"
                  onClick={() => setShowProjection(!showProjection)}
                  className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Revenue Projection & Waterfall Breakdown
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Based on ${selectedVehicle.pricePerDay}/day at {formData.occupancyRate}% occupancy
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${showProjection ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Compact Summary (shown when collapsed) */}
                {!showProjection && (
                  <div className="px-4 py-3 border-t border-gray-100 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className={`text-lg font-bold ${pricing.incomeROI >= 8 ? "text-green-600" : pricing.incomeROI >= 4 ? "text-yellow-600" : "text-red-600"}`}>
                        {pricing.incomeROI.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">Income ROI</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${fundraisingType === "co_invest" ? "text-indigo-800" : "text-blue-800"}`}>
                        ${fmt(pricing.rentorTotalIncome)}
                      </p>
                      <p className="text-xs text-gray-500">Your Income/yr</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-700">
                        ${fmt(pricing.netToInvestors)}
                      </p>
                      <p className="text-xs text-gray-500">Investor Dist./yr</p>
                    </div>
                  </div>
                )}

                {/* Full Breakdown (shown when expanded) */}
                {showProjection && (
                  <div className="p-4 space-y-3 border-t border-gray-200">
                    {/* Gross Revenue */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Gross Annual Revenue</span>
                      <span className="text-sm font-semibold">${fmt(pricing.grossAnnualRevenue)}</span>
                    </div>

                    {/* Waterfall items */}
                    <div className="border-t border-gray-100 pt-2 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Platform Fee (15%)</span>
                        <span className="text-red-500">-${fmt(pricing.platformFee)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Maintenance Reserve (10%)</span>
                        <span className="text-red-500">-${fmt(pricing.maintenance)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Insurance (5%)</span>
                        <span className="text-red-500">-${fmt(pricing.insurance)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Operating Costs (10%)</span>
                        <span className="text-red-500">-${fmt(pricing.operatingCosts)}</span>
                      </div>
                    </div>

                    {/* Operator Fee */}
                    <div className="border-t border-blue-100 pt-2 flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Operator Fee (10%)</span>
                      <span className="text-sm font-bold text-blue-700">${fmt(pricing.operatorFee)}/yr</span>
                    </div>

                    {/* Net to Token Holders */}
                    <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700">Net to Token Holders (50%)</span>
                      <span className="text-sm font-bold text-green-700">${fmt(pricing.netToInvestors)}/yr</span>
                    </div>

                    {/* Key Metrics - Income Only */}
                    <div className="border-t border-gray-200 pt-3 grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className={`text-xl font-bold ${pricing.incomeROI >= 8 ? "text-green-600" : pricing.incomeROI >= 4 ? "text-yellow-600" : "text-red-600"}`}>
                          {pricing.incomeROI.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Income ROI</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-800">
                          {pricing.breakevenMonths < 999 ? `${pricing.breakevenMonths.toFixed(0)}mo` : "--"}
                        </p>
                        <p className="text-xs text-gray-500">Income Breakeven</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-800">
                          ${pricing.monthlyDistribution.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-gray-500">Monthly Dist.</p>
                      </div>
                    </div>

                    {/* Depreciation Impact - over campaign duration */}
                    {parseFloat(formData.annualDepreciation) > 0 && (
                      <div className="border-t border-orange-200 pt-3 space-y-2">
                        <h4 className="text-xs font-semibold text-orange-800 uppercase tracking-wide">
                          Depreciation Impact ({pricing.durationYears.toFixed(1)} yr campaign)
                        </h4>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600">Total Distributions</span>
                            <span className="text-green-600 font-medium">+${fmt(pricing.totalDistributions)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600">Asset Value at End</span>
                            <span className="text-gray-700">${fmt(pricing.assetValueAtEnd)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600">Depreciation Loss</span>
                            <span className="text-orange-600 font-medium">-${fmt(pricing.depreciationLoss)}</span>
                          </div>
                        </div>

                        <div className="border-t border-orange-100 pt-2 grid grid-cols-2 gap-3">
                          <div className="text-center">
                            <p className={`text-xl font-bold ${pricing.netROI >= 5 ? "text-green-600" : pricing.netROI >= 0 ? "text-yellow-600" : "text-red-600"}`}>
                              {pricing.netROI.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">Net ROI (after depreciation)</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-xl font-bold ${pricing.netReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {pricing.netReturn >= 0 ? "+" : ""}${pricing.netReturn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-gray-500">Net Investor Return</p>
                          </div>
                        </div>

                        {/* Net ROI Guidance */}
                        <div className={`rounded-md p-2 text-xs ${pricing.netROI >= 5 ? "bg-green-50 text-green-800" : pricing.netROI >= 0 ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"}`}>
                          {pricing.netROI >= 5
                            ? "Strong net return after depreciation. Campaign is viable for investors."
                            : pricing.netROI >= 0
                              ? "Marginal return after depreciation. Investors may prefer shorter durations or higher occupancy."
                              : "Negative net return. Rental income does not offset asset depreciation at this target amount. Consider lowering the target or increasing rental rate."}
                        </div>
                      </div>
                    )}

                    {/* Rentor Income Projection */}
                    <div className="border-t-2 border-indigo-200 pt-3 space-y-2">
                      <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">
                        Your Projected Income (Rentor)
                        <InfoTooltip text="This shows your total annual income as the vehicle operator. Operator fee is always earned. Token distributions are only earned if you co-invest." />
                      </h4>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-blue-700">Operator Fee (always earned)</span>
                          <span className="text-blue-700 font-semibold">${fmt(pricing.operatorFee)}/yr</span>
                        </div>
                        {fundraisingType === "co_invest" && pricing.rentorInvestAmt > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-indigo-700">Token Distributions ({(pricing.rentorShare * 100).toFixed(1)}% share)</span>
                            <span className="text-indigo-700 font-semibold">${fmt(pricing.rentorTokenIncome)}/yr</span>
                          </div>
                        )}
                      </div>

                      <div className={`flex justify-between items-center pt-1 border-t ${fundraisingType === "co_invest" ? "border-indigo-100" : "border-blue-100"}`}>
                        <span className={`text-sm font-semibold ${fundraisingType === "co_invest" ? "text-indigo-800" : "text-blue-800"}`}>
                          Total Rentor Income
                        </span>
                        <span className={`text-lg font-bold ${fundraisingType === "co_invest" ? "text-indigo-800" : "text-blue-800"}`}>
                          ${fmt(pricing.rentorTotalIncome)}/yr
                        </span>
                      </div>

                      {fundraisingType === "full_fundraise" && (
                        <p className="text-xs text-gray-500 italic">
                          Tip: Co-invest to earn additional token distributions on top of your operator fee.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Campaign Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isLoading}
                rows={3}
                placeholder="Describe why you're raising funds, how they'll be used, and what returns investors can expect..."
                className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>How it works:</strong> Investors purchase asset tokens representing fractional ownership.
                Funds are released based on milestones. Revenue from rentals is distributed proportionally to token holders
                after the revenue waterfall deductions.
                {fundraisingType === "co_invest" && (
                  <span className="block mt-1">
                    <strong>Co-Investment:</strong> After creating this campaign, you can invest in it through the marketplace
                    to receive your revenue tokens. Your investment will count toward the fundraising target.
                  </span>
                )}
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <Button type="submit" className="flex-1" isLoading={isLoading}>
                {isLoading ? "Creating Campaign..." : "Create Campaign"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
