"use client";

import { useState } from "react";
import { Heading, Paragraph, Card, CardContent, Button, Badge } from "@/components/ui";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import { kycApi } from "@/lib/api";
import { useEthToUsd } from "@/hooks/usePriceFeed";
import Link from "next/link";

const INVESTOR_TYPES = [
  {
    id: 2,
    name: "Accredited Investor",
    tag: "ACCREDITED",
    lockEth: 0.1,
    minInvestment: "0.1 ETH",
    maxInvestment: "10 ETH total",
    lockPeriod: "3 months",
    description: "Verified accredited investors with medium capital allocation.",
    features: [
      "MultiSig wallet protection",
      "Higher investment limits",
      "Accreditation verification required",
    ],
  },
  {
    id: 3,
    name: "Institutional Investor",
    tag: "INSTITUTIONAL",
    lockEth: 1,
    minInvestment: "1 ETH",
    maxInvestment: "Unlimited",
    lockPeriod: "12 months",
    description: "Large institutions and strategic partners with significant capital.",
    features: [
      "MultiSig wallet protection",
      "No maximum investment limit",
      "Dedicated support",
    ],
  },
] as const;

const TYPE_NAMES: Record<number, string> = {
  1: "Retail",
  2: "Accredited",
  3: "Institutional",
};

export default function InvestorUpgradePage() {
  const { investorType, isKYCApproved, upgradeRequest, refetchKYC } = useComplianceStatus();
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Default to Retail (1) if investorType is null but KYC approved
  const currentType = investorType ?? 1;

  // Filter types to only show those above current
  const availableTypes = INVESTOR_TYPES.filter(
    (t) => t.id > currentType
  );

  const handleSubmit = async () => {
    if (!selectedType) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("targetType", String(selectedType));
      if (reason) formData.append("reason", reason);

      const response = await kycApi.requestUpgrade(formData);
      if (response.success) {
        setSuccess(true);
        await refetchKYC();
      } else {
        setError(response.message || "Failed to submit upgrade request");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit upgrade request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not eligible
  if (!isKYCApproved) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Heading as="h2" className="mb-2">Not Eligible</Heading>
            <Paragraph>You must have an approved KYC before requesting an upgrade.</Paragraph>
            <Link href="/investor/dashboard" className="mt-4 inline-block">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already at max tier
  if (currentType >= 3) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Heading as="h2" className="mb-2">Institutional Investor</Heading>
            <Paragraph>You already have the highest investor tier.</Paragraph>
            <Link href="/investor/dashboard" className="mt-4 inline-block">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending upgrade request
  if (upgradeRequest?.status === "pending") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Heading as="h1" className="mb-2">Upgrade Request</Heading>
          <Paragraph>Your upgrade request is being reviewed.</Paragraph>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="warning">Pending Review</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Current Type:</span> {TYPE_NAMES[upgradeRequest.currentType]}</p>
              <p><span className="font-medium">Requested Type:</span> {TYPE_NAMES[upgradeRequest.targetType]}</p>
              {upgradeRequest.reason && (
                <p><span className="font-medium">Reason:</span> {upgradeRequest.reason}</p>
              )}
              {upgradeRequest.requestedAt && (
                <p><span className="font-medium">Submitted:</span> {new Date(upgradeRequest.requestedAt).toLocaleDateString()}</p>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              You will be notified once the admin reviews your request.
            </p>
          </CardContent>
        </Card>
        <div className="mt-4">
          <Link href="/investor/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Rejected upgrade - allow resubmission
  if (upgradeRequest?.status === "rejected") {
    // Show rejection info but allow resubmission (form below will show)
  }

  // Success state
  if (success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <Heading as="h2" className="mb-2">Upgrade Request Submitted</Heading>
            <Paragraph>
              Your request to upgrade to {TYPE_NAMES[selectedType!]} has been submitted.
              You will be notified when the admin reviews your request.
            </Paragraph>
            <Link href="/investor/dashboard" className="mt-4 inline-block">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/investor/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          &larr; Back to Dashboard
        </Link>
        <Heading as="h1" className="mb-2">Upgrade Investor Type</Heading>
        <Paragraph>
          Currently <span className="font-semibold">{TYPE_NAMES[currentType]}</span>.
          Select a higher tier to access increased investment limits.
        </Paragraph>
      </div>

      {/* Previous rejection notice */}
      {upgradeRequest?.status === "rejected" && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="font-medium text-red-900">Previous upgrade request was rejected</p>
          {upgradeRequest.rejectionReason && (
            <p className="text-sm text-red-700 mt-1">Reason: {upgradeRequest.rejectionReason}</p>
          )}
          <p className="text-sm text-red-700 mt-1">You may submit a new request below.</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Type Selection */}
      <div className="space-y-4 mb-6">
        {availableTypes.map((type) => (
          <UpgradeTypeCard
            key={type.id}
            type={type}
            selected={selectedType === type.id}
            onSelect={() => setSelectedType(type.id)}
          />
        ))}
      </div>

      {/* Reason */}
      {selectedType && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Upgrade (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Describe why you'd like to upgrade (e.g., increased investment capacity, institutional backing, etc.)"
            />
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!selectedType || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Submitting..." : "Submit Upgrade Request"}
      </Button>
    </div>
  );
}

function UpgradeTypeCard({
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
      <div className="absolute top-5 right-5">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"
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

      <div className="flex items-center gap-3 mb-3 pr-8">
        <h3 className="text-lg font-bold text-gray-900">{type.name}</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">{type.description}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Lock Required</p>
          <p className="font-semibold text-gray-900">{type.lockEth} ETH</p>
          {lockUsd > 0 && <p className="text-xs text-gray-500">~${lockUsd.toFixed(2)}</p>}
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

      <ul className="space-y-1">
        {type.features.map((feature, idx) => (
          <li key={idx} className="text-sm flex items-center gap-2 text-gray-700">
            <span className="text-green-500">&#10003;</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
