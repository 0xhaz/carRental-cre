"use client";

import { Card, CardContent, Button } from "@/components/ui";
import { useEthToUsd } from "@/hooks/usePriceFeed";

const INVESTOR_TYPES = [
  {
    id: 1,
    name: "Retail Investor",
    tag: "RETAIL",
    lockEth: 0.01,
    minInvestment: "0.001 ETH",
    maxInvestment: "1 ETH per vehicle",
    lockPeriod: "6 months",
    steps: 2,
    description: "Individual investors getting started with vehicle investments.",
    features: [
      "Direct lock — no MultiSig required",
      "2-step onboarding (fastest approval)",
      "Ideal for beginners",
    ],
    recommended: true,
  },
  {
    id: 2,
    name: "Accredited Investor",
    tag: "ACCREDITED",
    lockEth: 0.1,
    minInvestment: "0.1 ETH",
    maxInvestment: "10 ETH total",
    lockPeriod: "3 months",
    steps: 5,
    description: "Verified accredited investors with medium capital allocation.",
    features: [
      "MultiSig wallet protection",
      "Higher investment limits",
      "Accreditation verification required",
    ],
    recommended: false,
  },
  {
    id: 3,
    name: "Institutional Investor",
    tag: "INSTITUTIONAL",
    lockEth: 1,
    minInvestment: "1 ETH",
    maxInvestment: "Unlimited",
    lockPeriod: "12 months",
    steps: 5,
    description: "Large institutions and strategic partners with significant capital.",
    features: [
      "MultiSig wallet protection",
      "No maximum investment limit",
      "Dedicated support",
    ],
    recommended: false,
  },
] as const;

interface InvestorTypeSelectorProps {
  selectedType: number | null;
  onSelect: (type: number) => void;
  onContinue: () => void;
}

export function InvestorTypeSelector({
  selectedType,
  onSelect,
  onContinue,
}: InvestorTypeSelectorProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Select Your Investor Type
      </h2>
      <p className="text-gray-600 mb-6">
        Choose the investor tier that matches your investment profile. Each tier
        has different lock requirements, investment limits, and onboarding steps.
      </p>

      <div className="space-y-4 mb-6">
        {INVESTOR_TYPES.map((type) => (
          <InvestorTypeCard
            key={type.id}
            type={type}
            selected={selectedType === type.id}
            onSelect={() => onSelect(type.id)}
          />
        ))}
      </div>

      <Button
        onClick={onContinue}
        disabled={!selectedType}
        className="w-full"
      >
        Continue to KYC Verification
      </Button>
    </div>
  );
}

function InvestorTypeCard({
  type,
  selected,
  onSelect,
}: {
  type: (typeof INVESTOR_TYPES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const { usd: lockUsd } = useEthToUsd(type.lockEth);

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-lg border-2 p-5 cursor-pointer transition-all ${
        selected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      {/* Selection indicator */}
      <div className="absolute top-5 right-5">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selected
              ? "border-blue-500 bg-blue-500"
              : "border-gray-300 bg-white"
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3 pr-8">
        <h3 className="text-lg font-bold text-gray-900">{type.name}</h3>
        {type.recommended && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
            Recommended
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4">{type.description}</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Lock Required</p>
          <p className="font-semibold text-gray-900">{type.lockEth} ETH</p>
          {lockUsd > 0 && (
            <p className="text-xs text-gray-500">
              ~${lockUsd.toFixed(2)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Min Investment</p>
          <p className="font-semibold text-gray-900">{type.minInvestment}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Max Investment</p>
          <p className="font-semibold text-gray-900">{type.maxInvestment}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Lock Period</p>
          <p className="font-semibold text-gray-900">{type.lockPeriod}</p>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-1">
        {type.features.map((feature, idx) => (
          <li key={idx} className="text-sm flex items-center gap-2 text-gray-700">
            <span className="text-green-500">&#10003;</span>
            {feature}
          </li>
        ))}
      </ul>

      {/* Steps info */}
      <p className="text-xs text-gray-500 mt-3">
        {type.steps}-step onboarding process
      </p>
    </div>
  );
}
