"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Card, CardContent, Button, Badge, Progress } from "@/components/ui";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import { useUserStore } from "@/store/userStore";
import { toast } from "react-hot-toast";
import { authApi, kycApi } from "@/lib/api";

type OnboardingStep = "connect" | "bind" | "kyc" | "verify" | "complete";

export interface ComplianceOnboardingFlowProps {
  roleType: "investor" | "rentor";
  onComplete?: () => void;
}

/**
 * ComplianceOnboardingFlow Component
 * Multi-step wizard for investor/rentor compliance verification
 */
export function ComplianceOnboardingFlow({
  roleType,
  onComplete,
}: ComplianceOnboardingFlowProps) {
  const { address, isConnected } = useAccount();
  const { user, setUser } = useUserStore();
  const { authenticateWithWallet } = useWalletAuth();
  const compliance = useComplianceStatus();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("connect");
  const [isProcessing, setIsProcessing] = useState(false);
  const [kycDocuments, setKycDocuments] = useState<{
    idDocument?: File;
    proofOfAddress?: File;
  }>({});

  // Determine current step based on compliance status
  useEffect(() => {
    if (compliance.isFullyCompliant) {
      setCurrentStep("complete");
    } else if (compliance.hasWalletBound && !compliance.isVerifiedOnChain) {
      setCurrentStep("kyc");
    } else if (!compliance.hasWalletBound && isConnected) {
      setCurrentStep("bind");
    } else {
      setCurrentStep("connect");
    }
  }, [compliance, isConnected]);

  // Step 1: Connect Wallet
  const handleConnectWallet = () => {
    // Wallet connection is handled by the ConnectButton in the navbar
    // This just provides instructions
    toast.info("Click 'Connect Wallet' in the top navigation bar");
  };

  // Step 2: Bind Wallet to Account
  const handleBindWallet = async () => {
    if (!address || !isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);
    try {
      // Call bind wallet API
      const response = await authApi.bindWallet({
        walletAddress: address,
      });

      if (response.success) {
        toast.success("Wallet successfully bound to your account!");

        // Update user in store
        if (response.user) {
          setUser(response.user);
        }

        setCurrentStep("kyc");
      } else {
        toast.error(response.message || "Failed to bind wallet");
      }
    } catch (error: any) {
      console.error("Bind wallet error:", error);
      toast.error(error.message || "Failed to bind wallet");
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 3: Submit KYC Documents
  const handleSubmitKYC = async () => {
    if (!kycDocuments.idDocument || !kycDocuments.proofOfAddress) {
      toast.error("Please upload all required documents");
      return;
    }

    setIsProcessing(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("roleType", roleType);
      formData.append("primaryDocument", kycDocuments.idDocument);
      formData.append("proofOfAddress", kycDocuments.proofOfAddress);

      // Add personal info (simplified)
      formData.append(
        "personalInfo",
        JSON.stringify({
          fullName: user?.name || "",
          nationality: "US",
          occupation: roleType === "investor" ? "Investor" : "Business Owner",
        })
      );

      // Add role-specific info
      if (roleType === "rentor") {
        formData.append(
          "businessInfo",
          JSON.stringify({
            businessName: `${user?.name}'s Fleet`,
            businessType: "Vehicle Rental",
          })
        );
      }

      if (roleType === "investor") {
        formData.append(
          "investorInfo",
          JSON.stringify({
            accreditationType: "retail",
            investmentExperience: "Beginner",
          })
        );
      }

      // Submit to backend
      const response = await kycApi.submit(formData);

      if (response.success) {
        toast.success("KYC documents submitted successfully!");
        toast("Documents are under review. You'll be notified once approved.");

        // Close the modal after successful submission
        if (onComplete) {
          onComplete();
        }
      } else {
        toast.error(response.message || "Failed to submit KYC");
      }
    } catch (error: any) {
      console.error("KYC submission error:", error);
      toast.error(error.response?.data?.message || "Failed to submit KYC documents");
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    { id: "connect", label: "Connect Wallet", icon: "🔌" },
    { id: "bind", label: "Bind Wallet", icon: "🔗" },
    { id: "kyc", label: "KYC Verification", icon: "📄" },
    { id: "verify", label: "Verification", icon: "✅" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <Card className="max-w-3xl mx-auto">
      <CardContent className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
            {roleType === "investor" ? "💼" : "🚗"}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {roleType === "investor" ? "Investor" : "Vehicle Owner"} Verification
          </h2>
          <p className="text-gray-600">
            Complete the following steps to start {roleType === "investor" ? "investing" : "listing vehicles"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  index <= currentStepIndex ? "opacity-100" : "opacity-40"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1 ${
                    index < currentStepIndex
                      ? "bg-green-500 text-white"
                      : index === currentStepIndex
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {index < currentStepIndex ? "✓" : step.icon}
                </div>
                <span className="text-xs text-gray-600">{step.label}</span>
              </div>
            ))}
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          {currentStep === "connect" && (
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Step 1: Connect Your Wallet</h3>
              <p className="text-gray-600 mb-6">
                Connect your MetaMask or other Web3 wallet to get started
              </p>
              {isConnected ? (
                <div>
                  <Badge variant="success" className="mb-4">
                    ✓ Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                  </Badge>
                  <Button onClick={() => setCurrentStep("bind")} className="w-full">
                    Continue to Next Step
                  </Button>
                </div>
              ) : (
                <Button onClick={handleConnectWallet} className="w-full">
                  Connect Wallet via Navbar
                </Button>
              )}
            </div>
          )}

          {currentStep === "bind" && (
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Step 2: Bind Wallet to Account</h3>
              <p className="text-gray-600 mb-6">
                Link your wallet address ({address?.slice(0, 6)}...{address?.slice(-4)}) to your RegShield account
              </p>
              <div className="bg-white rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="font-semibold">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Wallet:</span>
                  <code className="font-mono text-sm">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </code>
                </div>
              </div>
              <Button
                onClick={handleBindWallet}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "Binding..." : "Bind Wallet to Account"}
              </Button>
            </div>
          )}

          {currentStep === "kyc" && (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-center">
                Step 3: KYC Verification
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Upload required documents for identity verification
              </p>

              <div className="space-y-4">
                {/* ID Document Upload */}
                <div className="bg-white rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {roleType === "investor" ? "Government-issued ID" : "Business Registration"}
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      setKycDocuments({
                        ...kycDocuments,
                        idDocument: e.target.files?.[0],
                      })
                    }
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {kycDocuments.idDocument && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ {kycDocuments.idDocument.name}
                    </p>
                  )}
                </div>

                {/* Proof of Address */}
                <div className="bg-white rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof of Address (Utility Bill, Bank Statement)
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      setKycDocuments({
                        ...kycDocuments,
                        proofOfAddress: e.target.files?.[0],
                      })
                    }
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {kycDocuments.proofOfAddress && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ {kycDocuments.proofOfAddress.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSubmitKYC}
                  disabled={
                    isProcessing ||
                    !kycDocuments.idDocument ||
                    !kycDocuments.proofOfAddress
                  }
                  className="w-full mt-4"
                >
                  {isProcessing ? "Submitting..." : "Submit KYC Documents"}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "verify" && (
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Step 4: Under Review</h3>
              <div className="w-20 h-20 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
                ⏳
              </div>
              <p className="text-gray-600 mb-4">
                Your KYC documents are being reviewed by our compliance team
              </p>
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  This usually takes 1-3 business days. You'll receive an email once approved.
                </p>
              </div>
              <Badge variant="default">Pending Verification</Badge>
            </div>
          )}

          {currentStep === "complete" && (
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">🎉 Verification Complete!</h3>
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
                ✅
              </div>
              <p className="text-gray-600 mb-6">
                Your account is fully verified. You can now{" "}
                {roleType === "investor" ? "invest in vehicles" : "list your vehicles"}!
              </p>
              <Button onClick={onComplete} className="w-full">
                Get Started
              </Button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Why KYC?</strong> Regulatory compliance requires identity verification for
            {roleType === "investor" ? " investors" : " vehicle owners"} to ensure platform security
            and prevent fraud.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
