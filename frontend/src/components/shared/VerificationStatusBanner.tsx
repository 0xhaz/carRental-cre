"use client";

import { useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import { ComplianceOnboardingFlow } from "./ComplianceOnboardingFlow";

export interface VerificationStatusBannerProps {
  roleType: "investor" | "rentor";
  className?: string;
}

/**
 * VerificationStatusBanner Component
 * Shows compliance status and prompts user to complete verification
 */
export function VerificationStatusBanner({
  roleType,
  className,
}: VerificationStatusBannerProps) {
  const compliance = useComplianceStatus();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isResubmit, setIsResubmit] = useState(false);

  // Loading state
  if (compliance.isLoading) {
    return (
      <Card className={`p-4 mb-6 ${className}`}>
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </Card>
    );
  }

  // Onboarding modal
  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="relative w-full max-w-4xl my-8">
          <button
            onClick={() => { setShowOnboarding(false); setIsResubmit(false); }}
            className="absolute -top-4 -right-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <ComplianceOnboardingFlow
            roleType={roleType}
            onComplete={() => { setShowOnboarding(false); setIsResubmit(false); }}
            forceRestart={isResubmit}
          />
        </div>
      </div>
    );
  }

  // KYC is approved — show verified banner with resubmit option
  // This triggers on isKYCApproved (not isFullyCompliant) because the user may have
  // a wallet mismatch but their KYC is still valid
  if (compliance.isKYCApproved || compliance.isVerifiedOnChain) {
    const needsWalletFix = !compliance.isFullyCompliant;
    return (
      <Card className={`bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">✅</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-gray-900">
                  KYC Verified
                </h3>
                <Badge variant="success">Verified</Badge>
              </div>
              <p className="text-gray-700 mb-4">
                {compliance.isFullyCompliant
                  ? `Your account is fully verified. You can ${roleType === "investor" ? "invest in vehicles" : "list vehicles for investment"}.`
                  : "Your KYC is approved. Please connect your registered wallet to complete verification."}
              </p>

              {/* Wallet mismatch warning */}
              {needsWalletFix && compliance.missingSteps.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    {compliance.missingSteps[0]}
                  </p>
                </div>
              )}

              {/* Verification Status */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <Badge variant={compliance.hasWalletBound ? "success" : "default"}>
                  {compliance.hasWalletBound ? "✓" : "○"} Wallet Bound
                </Badge>
                <Badge variant={compliance.isWalletConnected ? "success" : "default"}>
                  {compliance.isWalletConnected ? "✓" : "○"} Wallet Connected
                </Badge>
                <Badge variant="success">✓ KYC Verified</Badge>
              </div>

              {/* Resubmit Button */}
              <Button
                variant="outline"
                size="default"
                onClick={() => { setIsResubmit(true); setShowOnboarding(true); }}
              >
                Resubmit Verification
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Use this to change your wallet or update your verification documents.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Not compliant and KYC not approved — show warning banner
  return (
    <Card className={`bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">⚠️</span>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-gray-900">
                Verification Required
              </h3>
              <Badge variant="error">Action Needed</Badge>
            </div>

            <p className="text-gray-700 mb-4">
              You need to complete identity verification before you can{" "}
              {roleType === "investor" ? "invest in vehicles" : "list vehicles for investment"}.
            </p>

            {/* Missing Steps */}
            {compliance.missingSteps.length > 0 && (
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Required Steps:
                </p>
                <ul className="space-y-1">
                  {compliance.missingSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verification Status */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <Badge variant={compliance.hasWalletBound ? "success" : "default"}>
                {compliance.hasWalletBound ? "✓" : "○"} Wallet Bound
              </Badge>
              <Badge variant={compliance.isWalletConnected ? "success" : "default"}>
                {compliance.isWalletConnected ? "✓" : "○"} Wallet Connected
              </Badge>
              <Badge variant={compliance.kycStatus === "pending" || compliance.kycStatus === "under_review" ? "default" : "default"}>
                {compliance.kycStatus === "pending" || compliance.kycStatus === "under_review"
                  ? "⏳ KYC Under Review"
                  : compliance.kycStatus === "rejected"
                  ? "✕ KYC Rejected"
                  : "○ KYC Pending"}
              </Badge>
            </div>

            {/* Action Button */}
            <Button onClick={() => setShowOnboarding(true)} size="default">
              Start Verification Process
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Compact version for smaller spaces
 */
export function VerificationStatusBadge({
  roleType,
  onClick,
}: {
  roleType: "investor" | "rentor";
  onClick?: () => void;
}) {
  const compliance = useComplianceStatus();

  if (compliance.isKYCApproved || compliance.isVerifiedOnChain || compliance.isFullyCompliant) {
    return (
      <Badge variant="success" className="gap-1">
        ✓ Verified {roleType === "investor" ? "Investor" : "Owner"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="error"
      className="gap-1 cursor-pointer hover:opacity-80"
      onClick={onClick}
    >
      ⚠️ Verification Required
    </Badge>
  );
}
