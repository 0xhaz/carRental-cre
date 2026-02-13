"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useUserStore } from "@/store";
import { authApi, kycApi } from "@/lib/api";
import { Card, CardContent, Button, Heading, Paragraph } from "@/components/ui";
import { toast } from "react-hot-toast";
import type { UserRole } from "@/types";

type VerificationStep = "connect-wallet" | "bind-wallet" | "kyc-upload" | "pending-approval";

export default function VerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as UserRole | null;

  const [currentStep, setCurrentStep] = useState<VerificationStep>("connect-wallet");
  const [isLoading, setIsLoading] = useState(false);
  const [kycFiles, setKycFiles] = useState<{
    primaryDocument: File | null;
    proofOfAddress: File | null;
  }>({
    primaryDocument: null,
    proofOfAddress: null,
  });

  const { user, setUser } = useUserStore();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Check user's verification state and determine initial step
  useEffect(() => {
    const determineInitialStep = async () => {
      // Check KYC status first
      try {
        const kycResponse = await kycApi.getStatus();

        if (kycResponse.success && kycResponse.data.hasKYC) {
          // KYC already submitted, show pending approval
          setCurrentStep("pending-approval");
          return;
        }
      } catch (error) {
        console.error("Failed to check KYC status:", error);
      }

      // If KYC not submitted, determine wallet connection state
      if (isConnected && address) {
        // Wallet connected via MetaMask
        // Always show bind-wallet step for manual confirmation
        // (even if wallet already bound in database)
        setCurrentStep("bind-wallet");
      } else if (user?.walletAddress) {
        // User has wallet in database but MetaMask not connected
        // Prompt them to connect their registered wallet
        setCurrentStep("connect-wallet");
      } else {
        // No wallet at all, start from beginning
        setCurrentStep("connect-wallet");
      }
    };

    determineInitialStep();
  }, [user?.walletAddress, isConnected, address]);

  // Determine role-specific text
  const roleType = roleParam || user?.role || "investor";
  const isInvestor = roleType === "investor";
  const documentLabel = isInvestor ? "Government ID (Passport, Driver's License)" : "Business Registration";

  const handleConnectWallet = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      connect({ connector });
    }
  };

  const handleBindWallet = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.bindWallet({ walletAddress: address });

      if (response.success) {
        setUser(response.user);
        toast.success("Wallet connected successfully!");
        setCurrentStep("kyc-upload");
      } else {
        toast.error(response.message || "Failed to bind wallet");
      }
    } catch (error: any) {
      console.error("Bind wallet error:", error);
      toast.error(error.response?.data?.message || "Failed to bind wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (field: "primaryDocument" | "proofOfAddress", file: File | null) => {
    setKycFiles((prev) => ({ ...prev, [field]: file }));
  };

  const handleSubmitKYC = async () => {
    if (!kycFiles.primaryDocument || !kycFiles.proofOfAddress) {
      toast.error("Please upload both required documents");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("roleType", roleType);
      formData.append("primaryDocument", kycFiles.primaryDocument);
      formData.append("proofOfAddress", kycFiles.proofOfAddress);

      // Add personal info (simplified for now)
      formData.append(
        "personalInfo",
        JSON.stringify({
          fullName: user?.name || "",
          nationality: "US",
          occupation: roleType === "investor" ? "Investor" : "Business Owner",
        })
      );

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

      const response = await kycApi.submit(formData);

      if (response.success) {
        toast.success("KYC documents submitted successfully!");
        setCurrentStep("pending-approval");
      } else {
        toast.error(response.message || "Failed to submit KYC");
      }
    } catch (error: any) {
      console.error("KYC submission error:", error);
      toast.error(error.response?.data?.message || "Failed to submit KYC documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    const redirectPath = roleType === "investor" ? "/investor/dashboard" : "/rentor/dashboard";
    router.push(redirectPath);
  };

  const steps = [
    {
      id: "connect-wallet",
      label: "Connect Wallet",
      completed: currentStep !== "connect-wallet",
    },
    {
      id: "bind-wallet",
      label: "Bind Wallet",
      completed: currentStep === "kyc-upload" || currentStep === "pending-approval",
    },
    {
      id: "kyc-upload",
      label: "KYC Verification",
      completed: currentStep === "pending-approval",
    },
    {
      id: "pending-approval",
      label: "Verification",
      completed: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <Heading as="h1" className="mb-2">
            {roleType === "investor" ? "Investor" : "Rentor"} Verification
          </Heading>
          <Paragraph className="text-lg">
            Complete the following steps to start {roleType === "investor" ? "investing" : "listing vehicles"}
          </Paragraph>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8 px-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {index !== 0 && (
                  <div
                    className={`flex-1 h-1 ${
                      step.completed ? "bg-green-500" : "bg-gray-300"
                    } transition-colors`}
                  />
                )}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.id === currentStep
                      ? "bg-blue-500 text-white"
                      : step.completed
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600"
                  } transition-colors mx-2`}
                >
                  {step.completed ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index !== steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 ${
                      steps[index + 1]?.completed ? "bg-green-500" : "bg-gray-300"
                    } transition-colors`}
                  />
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center hidden md:block">
                {step.label}
              </p>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-8">
            {/* Step 1: Connect Wallet */}
            {currentStep === "connect-wallet" && (
              <div>
                <Heading as="h2" className="mb-4">
                  Step 1: Connect Your Wallet
                </Heading>
                <Paragraph className="mb-6">
                  Connect your Web3 wallet to verify your identity and store your earnings securely.
                </Paragraph>

                <div className="space-y-4">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => handleConnectWallet(connector.id)}
                      className="w-full flex items-center justify-between px-6 py-4 border-2 border-gray-200 hover:border-primary hover:bg-primary hover:text-white rounded-lg transition-all font-medium"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-2xl">
                          {connector.name.includes("MetaMask") ? "🦊" : "💼"}
                        </span>
                        {connector.name}
                      </span>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Why connect a wallet?</strong> Your wallet address is used for identity
                    verification and to receive earnings from your investments or vehicle rentals.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Bind Wallet */}
            {currentStep === "bind-wallet" && (
              <div>
                <Heading as="h2" className="mb-4">
                  Step 2: Confirm Wallet Address
                </Heading>
                <Paragraph className="mb-6">
                  Please review and confirm the wallet address you want to use for your RegShield account.
                  {roleType === "rentor" && " If you have a separate business wallet, you can change to it now."}
                </Paragraph>

                {isConnected && address && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Wallet Detected</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">Connected Address:</p>
                    <p className="text-sm text-gray-900 font-mono break-all bg-white px-3 py-2 rounded border border-green-200">
                      {address}
                    </p>
                  </div>
                )}

                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Important:</strong> Once confirmed, this wallet will be permanently linked to your account.
                    To change it later, you'll need to resubmit KYC documents.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      disconnect();
                      setCurrentStep("connect-wallet");
                    }}
                    className="flex-1"
                  >
                    Use Different Wallet
                  </Button>
                  <Button onClick={handleBindWallet} isLoading={isLoading} className="flex-1">
                    ✓ Confirm & Save to Database
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  This wallet will be used for {roleType === "investor" ? "receiving investment returns" : "receiving rental payments"} and identity verification.
                </p>
              </div>
            )}

            {/* Step 3: KYC Upload */}
            {currentStep === "kyc-upload" && (
              <div>
                <Heading as="h2" className="mb-4">
                  Step 3: KYC Verification
                </Heading>
                <Paragraph className="mb-6">
                  Upload required documents for identity verification
                </Paragraph>

                <div className="space-y-6">
                  {/* Primary Document */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {documentLabel} *
                    </label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) =>
                        handleFileChange("primaryDocument", e.target.files?.[0] || null)
                      }
                      className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-primary"
                    />
                    {kycFiles.primaryDocument && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ {kycFiles.primaryDocument.name}
                      </p>
                    )}
                  </div>

                  {/* Proof of Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proof of Address (Utility Bill, Bank Statement) *
                    </label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) =>
                        handleFileChange("proofOfAddress", e.target.files?.[0] || null)
                      }
                      className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-primary"
                    />
                    {kycFiles.proofOfAddress && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ {kycFiles.proofOfAddress.name}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSubmitKYC}
                  isLoading={isLoading}
                  disabled={!kycFiles.primaryDocument || !kycFiles.proofOfAddress}
                  className="w-full mt-6"
                >
                  Submit KYC Documents
                </Button>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Why KYC?</strong> Regulatory compliance requires identity verification
                    for {roleType === "investor" ? "investors" : "vehicle owners"} to ensure
                    platform security and prevent fraud.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Pending Approval */}
            {currentStep === "pending-approval" && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <Heading as="h2" className="mb-4">
                  Verification Pending
                </Heading>
                <Paragraph className="mb-6">
                  Your KYC documents have been submitted and are under review. You'll receive a
                  notification once approved (typically within 24-48 hours).
                </Paragraph>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-green-600 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-left">
                      <p className="text-sm font-medium text-green-800">Wallet Connected</p>
                      <p className="text-xs text-green-700 font-mono mt-1">
                        {address?.slice(0, 10)}...{address?.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 mt-3">
                    <svg
                      className="w-5 h-5 text-green-600 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-left">
                      <p className="text-sm font-medium text-green-800">KYC Documents Submitted</p>
                      <p className="text-xs text-green-700 mt-1">Under admin review</p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleComplete} className="w-full">
                  Go to Dashboard
                </Button>

                <p className="text-xs text-gray-500 mt-4">
                  You can start exploring, but some features will be limited until verification is
                  complete.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
