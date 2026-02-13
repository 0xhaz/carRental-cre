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

  // Don't show banner if fully compliant
  if (compliance.isFullyCompliant) {
    return null;
  }

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
            onClick={() => setShowOnboarding(false)}
            className="absolute -top-4 -right-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <ComplianceOnboardingFlow
            roleType={roleType}
            onComplete={() => setShowOnboarding(false)}
          />
        </div>
      </div>
    );
  }

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
              <Badge variant="destructive">Action Needed</Badge>
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
            <div className="flex gap-3 mb-4">
              <Badge variant={compliance.hasWalletBound ? "success" : "default"}>
                {compliance.hasWalletBound ? "✓" : "○"} Wallet Bound
              </Badge>
              <Badge variant={compliance.isWalletConnected ? "success" : "default"}>
                {compliance.isWalletConnected ? "✓" : "○"} Wallet Connected
              </Badge>
              <Badge variant={compliance.isVerifiedOnChain ? "success" : "default"}>
                {compliance.isVerifiedOnChain ? "✓" : "○"} KYC Verified
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

  if (compliance.isFullyCompliant) {
    return (
      <Badge variant="success" className="gap-1">
        ✓ Verified {roleType === "investor" ? "Investor" : "Owner"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="destructive"
      className="gap-1 cursor-pointer hover:opacity-80"
      onClick={onClick}
    >
      ⚠️ Verification Required
    </Badge>
  );
}
