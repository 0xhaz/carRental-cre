"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useUserStore } from "@/store";
import { authApi, kycApi } from "@/lib/api";
import { Card, CardContent, Button, Heading, Paragraph } from "@/components/ui";
import { InvestorTypeSelector } from "@/components/investor/InvestorTypeSelector";
import { WorldIDVerifyButton } from "@/components/web3/WorldIDVerifyButton";
import { MiniKit } from "@worldcoin/minikit-js";
import { toast } from "react-hot-toast";
import type { UserRole } from "@/types";

type VerificationStep =
  | "connect-wallet"
  | "bind-wallet"
  | "world-id"
  | "investor-type"
  | "kyc-upload"
  | "pending-approval";

const INVESTOR_TYPE_LABELS: Record<number, string> = {
  1: "retail",
  2: "accredited",
  3: "institutional",
};

export default function VerificationPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">Loading...</div>}>
      <VerificationContent />
    </Suspense>
  );
}

function VerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as UserRole | null;

  const [currentStep, setCurrentStep] = useState<VerificationStep>("connect-wallet");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInvestorType, setSelectedInvestorType] = useState<number | null>(null);
  const [kycStatus, setKycStatus] = useState<{
    status: string;
    rejectionReason?: string;
  } | null>(null);
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

  // Renter personal info state
  const [renterPersonalInfo, setRenterPersonalInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [renterDriverInfo, setRenterDriverInfo] = useState({
    driverLicenseNumber: "",
    driverLicenseExpiry: "",
    driverLicenseIssuingState: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    insuranceExpiry: "",
  });

  // Determine role-specific text
  const roleType = roleParam || user?.role || "investor";
  const isInvestor = roleType === "investor";
  const isRenter = roleType === "renter";
  const documentLabel = isInvestor
    ? "Government ID (Passport, Driver's License)"
    : isRenter
    ? "Driver's License (Front)"
    : "Business Registration";

  // Check user's verification state and determine initial step
  useEffect(() => {
    const determineInitialStep = async () => {
      // Check KYC status first
      try {
        const kycResponse = await kycApi.getStatus();

        if (kycResponse.success && kycResponse.data.hasKYC) {
          setKycStatus({
            status: kycResponse.data.status,
            rejectionReason: kycResponse.data.rejectionReason,
          });

          // All statuses (approved, pending, under_review, rejected, expired) show pending-approval step
          setCurrentStep("pending-approval");
          return;
        }
      } catch (error) {
        console.error("Failed to check KYC status:", error);
      }

      // If KYC not submitted, determine wallet connection state
      if (isConnected && address) {
        setCurrentStep("bind-wallet");
      } else if (user?.walletAddress) {
        setCurrentStep("connect-wallet");
      } else {
        setCurrentStep("connect-wallet");
      }
    };

    determineInitialStep();
  }, [user?.walletAddress, isConnected, address]);

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
        // If inside World App, go to World ID step first
        if (MiniKit.isInstalled()) {
          setCurrentStep("world-id");
        } else {
          setCurrentStep(isInvestor ? "investor-type" : "kyc-upload");
        }
        // Pre-populate renter email from user
        if (isRenter && user?.email) {
          setRenterPersonalInfo((prev) => ({ ...prev, email: user.email || "" }));
        }
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

  // Validate renter personal info fields (insurance is optional)
  const isRenterInfoComplete =
    renterPersonalInfo.fullName &&
    renterPersonalInfo.email &&
    renterPersonalInfo.phone &&
    renterPersonalInfo.dateOfBirth &&
    renterPersonalInfo.street &&
    renterPersonalInfo.city &&
    renterPersonalInfo.state &&
    renterPersonalInfo.zipCode &&
    renterDriverInfo.driverLicenseNumber &&
    renterDriverInfo.driverLicenseExpiry &&
    renterDriverInfo.driverLicenseIssuingState;

  const handleSubmitKYC = async () => {
    if (!kycFiles.primaryDocument || !kycFiles.proofOfAddress) {
      toast.error("Please upload both required documents");
      return;
    }

    if (isRenter && !isRenterInfoComplete) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("roleType", roleType);
      formData.append("primaryDocument", kycFiles.primaryDocument);
      formData.append("proofOfAddress", kycFiles.proofOfAddress);

      if (isRenter) {
        // Renter: include full personal info with address + renterInfo
        formData.append(
          "personalInfo",
          JSON.stringify({
            fullName: renterPersonalInfo.fullName,
            dateOfBirth: renterPersonalInfo.dateOfBirth,
            nationality: "US",
            occupation: "Renter",
            address: {
              street: renterPersonalInfo.street,
              city: renterPersonalInfo.city,
              state: renterPersonalInfo.state,
              country: "USA",
              postalCode: renterPersonalInfo.zipCode,
            },
          })
        );
        formData.append(
          "renterInfo",
          JSON.stringify({
            driverLicenseNumber: renterDriverInfo.driverLicenseNumber,
            driverLicenseExpiry: renterDriverInfo.driverLicenseExpiry,
            driverLicenseIssuingState: renterDriverInfo.driverLicenseIssuingState,
            insuranceProvider: renterDriverInfo.insuranceProvider,
            insurancePolicyNumber: renterDriverInfo.insurancePolicyNumber,
            insuranceExpiry: renterDriverInfo.insuranceExpiry,
            phone: renterPersonalInfo.phone,
            email: renterPersonalInfo.email,
          })
        );
      } else {
        // Investor/Rentor: basic personal info
        formData.append(
          "personalInfo",
          JSON.stringify({
            fullName: user?.name || "",
            nationality: "US",
            occupation: roleType === "investor" ? "Investor" : "Business Owner",
          })
        );
      }

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
            accreditationType: selectedInvestorType
              ? INVESTOR_TYPE_LABELS[selectedInvestorType]
              : "retail",
            investmentExperience: "Beginner",
            investorType: selectedInvestorType || 1,
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
    const redirectPath = isInvestor
      ? "/investor/dashboard"
      : isRenter
      ? "/renter/browse"
      : "/rentor/dashboard";
    router.push(redirectPath);
  };

  // Steps configuration — investors have 5 steps, rentors have 4
  const isMiniApp = typeof window !== "undefined" && MiniKit.isInstalled();

  const investorSteps = [
    {
      id: "connect-wallet",
      label: "Connect Wallet",
      completed: currentStep !== "connect-wallet",
    },
    {
      id: "bind-wallet",
      label: "Bind Wallet",
      completed: ["world-id", "investor-type", "kyc-upload", "pending-approval"].includes(currentStep),
    },
    ...(isMiniApp
      ? [
          {
            id: "world-id",
            label: "World ID",
            completed: ["investor-type", "kyc-upload", "pending-approval"].includes(currentStep),
          },
        ]
      : []),
    {
      id: "investor-type",
      label: "Investor Type",
      completed: ["kyc-upload", "pending-approval"].includes(currentStep),
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

  const rentorSteps = [
    {
      id: "connect-wallet",
      label: "Connect Wallet",
      completed: currentStep !== "connect-wallet",
    },
    {
      id: "bind-wallet",
      label: "Bind Wallet",
      completed: ["world-id", "kyc-upload", "pending-approval"].includes(currentStep),
    },
    ...(isMiniApp
      ? [
          {
            id: "world-id",
            label: "World ID",
            completed: ["kyc-upload", "pending-approval"].includes(currentStep),
          },
        ]
      : []),
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

  const renterSteps = [
    {
      id: "connect-wallet",
      label: "Connect Wallet",
      completed: currentStep !== "connect-wallet",
    },
    {
      id: "bind-wallet",
      label: "Bind Wallet",
      completed: ["world-id", "kyc-upload", "pending-approval"].includes(currentStep),
    },
    ...(isMiniApp
      ? [
          {
            id: "world-id",
            label: "World ID",
            completed: ["kyc-upload", "pending-approval"].includes(currentStep),
          },
        ]
      : []),
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

  const steps = isInvestor ? investorSteps : isRenter ? renterSteps : rentorSteps;

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
            {isInvestor ? "Investor" : isRenter ? "Renter" : "Rentor"} Verification
          </Heading>
          <Paragraph className="text-lg">
            Complete the following steps to start{" "}
            {isInvestor ? "investing" : isRenter ? "booking vehicles" : "listing vehicles"}
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
                          {connector.name.includes("MetaMask") ? "\uD83E\uDD8A" : "\uD83D\uDCBC"}
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
                  Please review and confirm the wallet address you want to use for your RegShield
                  account.
                  {roleType === "rentor" &&
                    " If you have a separate business wallet, you can change to it now."}
                  {isRenter &&
                    " This wallet will be used for crypto rental payments."}
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
                    <strong>Important:</strong> Once confirmed, this wallet will be permanently
                    linked to your account. To change it later, you'll need to resubmit KYC
                    documents.
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
                    Confirm &amp; Save
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  This wallet will be used for{" "}
                  {isInvestor
                    ? "receiving investment returns"
                    : isRenter
                    ? "making crypto rental payments"
                    : "receiving rental payments"}{" "}
                  and identity verification.
                </p>
              </div>
            )}

            {/* World ID Step (Mini App only) */}
            {currentStep === "world-id" && (
              <div>
                <Heading as="h2" className="mb-4">
                  World ID Verification
                </Heading>
                <Paragraph className="mb-6">
                  Verify your personhood with World ID for enhanced security and Sybil
                  resistance. This proves you are a unique human without revealing personal data.
                </Paragraph>

                <WorldIDVerifyButton
                  onVerified={() => {
                    toast.success("World ID verified successfully!");
                    setCurrentStep(isInvestor ? "investor-type" : "kyc-upload");
                  }}
                />

                <button
                  onClick={() =>
                    setCurrentStep(isInvestor ? "investor-type" : "kyc-upload")
                  }
                  className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Skip for now
                </button>
              </div>
            )}

            {/* Step 3 (Investor Only): Select Investor Type */}
            {currentStep === "investor-type" && (
              <InvestorTypeSelector
                selectedType={selectedInvestorType}
                onSelect={setSelectedInvestorType}
                onContinue={() => setCurrentStep("kyc-upload")}
              />
            )}

            {/* Step 3/4: KYC Upload */}
            {currentStep === "kyc-upload" && (
              <div>
                <Heading as="h2" className="mb-4">
                  Step {isInvestor ? "4" : "3"}: KYC Verification
                </Heading>
                <Paragraph className="mb-6">
                  {isRenter
                    ? "Fill in your personal details and upload your driver's license"
                    : "Upload required documents for identity verification"}
                </Paragraph>

                {/* Show selected investor type reminder */}
                {isInvestor && selectedInvestorType && (
                  <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Investor Type:</strong>{" "}
                      {selectedInvestorType === 1
                        ? "Retail"
                        : selectedInvestorType === 2
                        ? "Accredited"
                        : "Institutional"}
                      <button
                        onClick={() => setCurrentStep("investor-type")}
                        className="ml-2 text-blue-600 underline text-xs"
                      >
                        Change
                      </button>
                    </p>
                  </div>
                )}

                {/* Renter Personal Info Form */}
                {isRenter && (
                  <div className="space-y-4 mb-8">
                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={renterPersonalInfo.fullName}
                          onChange={(e) => setRenterPersonalInfo((p) => ({ ...p, fullName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={renterPersonalInfo.email}
                          onChange={(e) => setRenterPersonalInfo((p) => ({ ...p, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                        <input
                          type="tel"
                          value={renterPersonalInfo.phone}
                          onChange={(e) => setRenterPersonalInfo((p) => ({ ...p, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                        <input
                          type="date"
                          value={renterPersonalInfo.dateOfBirth}
                          onChange={(e) => setRenterPersonalInfo((p) => ({ ...p, dateOfBirth: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide pt-2">
                      Address
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                        <input
                          type="text"
                          value={renterPersonalInfo.street}
                          onChange={(e) => setRenterPersonalInfo((p) => ({ ...p, street: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="123 Main St"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                        <input
                          type="text"
                          value={renterPersonalInfo.city}
                          onChange={(e) => setRenterPersonalInfo((p) => ({ ...p, city: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="New York"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                        <input
                          type="text"
                          value={renterPersonalInfo.state}
                          onChange={(e) => setRenterPersonalInfo((p) => ({ ...p, state: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="NY"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                        <input
                          type="text"
                          value={renterPersonalInfo.zipCode}
                          onChange={(e) => setRenterPersonalInfo((p) => ({ ...p, zipCode: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="10001"
                        />
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide pt-2">
                      Driver&apos;s License
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
                        <input
                          type="text"
                          value={renterDriverInfo.driverLicenseNumber}
                          onChange={(e) => setRenterDriverInfo((p) => ({ ...p, driverLicenseNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="DL12345678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                        <input
                          type="date"
                          value={renterDriverInfo.driverLicenseExpiry}
                          onChange={(e) => setRenterDriverInfo((p) => ({ ...p, driverLicenseExpiry: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issuing State *</label>
                        <input
                          type="text"
                          value={renterDriverInfo.driverLicenseIssuingState}
                          onChange={(e) => setRenterDriverInfo((p) => ({ ...p, driverLicenseIssuingState: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="NY"
                        />
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide pt-2">
                      Insurance <span className="text-xs font-normal normal-case text-gray-500">(Optional — you can purchase premium coverage at booking)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                        <input
                          type="text"
                          value={renterDriverInfo.insuranceProvider}
                          onChange={(e) => setRenterDriverInfo((p) => ({ ...p, insuranceProvider: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="State Farm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                        <input
                          type="text"
                          value={renterDriverInfo.insurancePolicyNumber}
                          onChange={(e) => setRenterDriverInfo((p) => ({ ...p, insurancePolicyNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                          placeholder="POL-123456"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={renterDriverInfo.insuranceExpiry}
                          onChange={(e) => setRenterDriverInfo((p) => ({ ...p, insuranceExpiry: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-2">
                      <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4">
                        Upload Documents
                      </h3>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Primary Document */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {documentLabel} *
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:border-primary hover:bg-gray-100 transition-colors">
                      <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {kycFiles.primaryDocument ? kycFiles.primaryDocument.name : "Choose file..."}
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) =>
                          handleFileChange("primaryDocument", e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                    </label>
                    {kycFiles.primaryDocument && (
                      <p className="mt-1 text-xs text-green-600">
                        &#10003; {kycFiles.primaryDocument.name}
                      </p>
                    )}
                  </div>

                  {/* Proof of Address / License Back */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isRenter
                        ? "Driver's License (Back) *"
                        : "Proof of Address (Utility Bill, Bank Statement) *"}
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:border-primary hover:bg-gray-100 transition-colors">
                      <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {kycFiles.proofOfAddress ? kycFiles.proofOfAddress.name : "Choose file..."}
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) =>
                          handleFileChange("proofOfAddress", e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                    </label>
                    {kycFiles.proofOfAddress && (
                      <p className="mt-1 text-xs text-green-600">
                        &#10003; {kycFiles.proofOfAddress.name}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSubmitKYC}
                  isLoading={isLoading}
                  disabled={
                    !kycFiles.primaryDocument ||
                    !kycFiles.proofOfAddress ||
                    (isRenter && !isRenterInfoComplete)
                  }
                  className="w-full mt-6"
                >
                  Submit KYC Documents
                </Button>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Why KYC?</strong> Regulatory compliance requires identity verification
                    for{" "}
                    {isInvestor
                      ? "investors"
                      : isRenter
                      ? "renters"
                      : "vehicle owners"}{" "}
                    to ensure platform security and prevent fraud.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4/5: Pending Approval / Rejected / Approved */}
            {currentStep === "pending-approval" && (
              <div className="text-center py-8">
                {/* Approved state */}
                {kycStatus?.status === "approved" ? (
                  <>
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-10 h-10 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>

                    <Heading as="h2" className="mb-4">
                      Verification Complete
                    </Heading>
                    <Paragraph className="mb-6">
                      Your identity has been verified. You&apos;re all set to{" "}
                      {isInvestor ? "start investing" : isRenter ? "book vehicles" : "list vehicles"}.
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
                          <p className="text-sm font-medium text-green-800">KYC Approved</p>
                          <p className="text-xs text-green-700 mt-1">
                            Your identity documents have been verified by admin
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleComplete} className="w-full">
                      {isInvestor ? "Go to Dashboard" : isRenter ? "Browse Vehicles" : "Go to Dashboard"}
                    </Button>

                    <Button
                      onClick={() => {
                        setKycStatus(null);
                        setKycFiles({ primaryDocument: null, proofOfAddress: null });
                        setCurrentStep("kyc-upload");
                      }}
                      variant="outline"
                      className="w-full mt-3"
                    >
                      Resubmit KYC Documents
                    </Button>
                  </>
                ) : kycStatus?.status === "rejected" ? (
                  <>
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-10 h-10 text-red-600"
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
                    </div>

                    <Heading as="h2" className="mb-4">
                      Verification Rejected
                    </Heading>
                    <Paragraph className="mb-6">
                      Your KYC submission was not approved. Please review the reason below and
                      resubmit with the correct information.
                    </Paragraph>

                    {kycStatus.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                        <p className="text-sm text-red-700">{kycStatus.rejectionReason}</p>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setKycStatus(null);
                        setKycFiles({ primaryDocument: null, proofOfAddress: null });
                        setCurrentStep("kyc-upload");
                      }}
                      className="w-full"
                    >
                      Resubmit KYC Documents
                    </Button>

                    <Button
                      onClick={handleComplete}
                      variant="outline"
                      className="w-full mt-3"
                    >
                      Go to Dashboard
                    </Button>
                  </>
                ) : kycStatus?.status === "expired" ? (
                  <>
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-10 h-10 text-orange-600"
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
                      Verification Expired
                    </Heading>
                    <Paragraph className="mb-6">
                      Your previous KYC verification has expired. Please resubmit your documents
                      to continue using the platform.
                    </Paragraph>

                    <Button
                      onClick={() => {
                        setKycStatus(null);
                        setKycFiles({ primaryDocument: null, proofOfAddress: null });
                        setCurrentStep("kyc-upload");
                      }}
                      className="w-full"
                    >
                      Resubmit KYC Documents
                    </Button>
                  </>
                ) : (
                  /* Pending / Under Review state */
                  <>
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

                    {isInvestor && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm text-blue-800">
                          <strong>Next Step:</strong> Once your KYC is approved, you'll need to complete
                          the on-chain investor onboarding (lock funds) from your dashboard before you
                          can start investing.
                        </p>
                      </div>
                    )}

                    {isRenter && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm text-blue-800">
                          <strong>Next Step:</strong> Once approved, your verified personal details
                          (name, phone, license) will be shared with vehicle owners when you book. You
                          won&apos;t need to re-enter this information for each booking.
                        </p>
                      </div>
                    )}

                    <Button onClick={handleComplete} className="w-full">
                      Go to Dashboard
                    </Button>

                    <p className="text-xs text-gray-500 mt-4">
                      You can start exploring, but some features will be limited until verification is
                      complete.
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
