"use client";

import { useState, useEffect } from "react";
import { Heading, Paragraph, Button, Card, CardContent, Badge } from "@/components/ui";
import { kycApi, type KYCSubmission } from "@/lib/api";
import { toast } from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { useVehicleNFT, useIdentityRegistry, useParticipantTypeRegistry, useRenterComplianceContract } from "@/hooks/useContracts";
import { Input } from "@/components/ui";
import { SEPOLIA_CONTRACTS } from "@/constants/contracts";
import { keccak256, toHex } from "viem";

export default function AdminKYCPage() {
  const [kycSubmissions, setKycSubmissions] = useState<KYCSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKYC, setSelectedKYC] = useState<KYCSubmission | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadPendingKYC();
  }, []);

  const loadPendingKYC = async () => {
    setIsLoading(true);
    try {
      const response = await kycApi.getPending();
      if (response.success) {
        setKycSubmissions(response.data || []);
      }
    } catch (error: any) {
      console.error("Failed to load KYC submissions:", error);
      toast.error(error.response?.data?.message || "Failed to load KYC submissions");
      setKycSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (kycId: string) => {
    try {
      const response = await kycApi.getById(kycId);
      if (response.success) {
        setSelectedKYC(response.data);
        setShowReviewModal(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load KYC details");
    }
  };

  const handleApprove = async (kycId: string, notes: string) => {
    try {
      const response = await kycApi.approve(kycId, notes);
      if (response.success) {
        toast.success("KYC approved successfully");
        setShowReviewModal(false);
        setSelectedKYC(null);
        loadPendingKYC(); // Reload list
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve KYC");
    }
  };

  const handleReject = async (kycId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      const response = await kycApi.reject(kycId, reason);
      if (response.success) {
        toast.success("KYC rejected");
        setShowReviewModal(false);
        setSelectedKYC(null);
        loadPendingKYC(); // Reload list
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject KYC");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "under_review":
        return "info";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          KYC Management
        </Heading>
        <Paragraph className="text-lg">
          Review and approve user verification documents
        </Paragraph>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Pending Review</p>
            <p className="text-3xl font-bold text-orange-600">
              {kycSubmissions.filter((k) => k.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Under Review</p>
            <p className="text-3xl font-bold text-blue-600">
              {kycSubmissions.filter((k) => k.status === "under_review").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Total Submissions</p>
            <p className="text-3xl font-bold text-gray-900">{kycSubmissions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* KYC Submissions Table */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h2" className="mb-4">
            Pending Submissions
          </Heading>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : kycSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Role Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {kycSubmissions.map((kyc) => (
                    <tr key={kyc._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{kyc.user.name}</p>
                          <p className="text-sm text-gray-600">{kyc.user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="default">{kyc.roleType}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={getStatusBadgeVariant(kyc.status)}>
                          {kyc.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(kyc.submittedAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <p className="text-gray-600">
                            {kyc.documents?.primaryDocument ? "✓" : "✗"} ID Document
                          </p>
                          <p className="text-gray-600">
                            {kyc.documents?.proofOfAddress ? "✓" : "✗"} Proof of Address
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          size="sm"
                          onClick={() => handleReview(kyc._id)}
                          disabled={kyc.status === "approved" || kyc.status === "rejected"}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Paragraph className="text-lg text-gray-600">
                No pending KYC submissions
              </Paragraph>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authorize Vehicle Operator */}
      <AuthorizeOperatorCard />

      {/* Register Identity On-Chain */}
      <RegisterIdentityCard />

      {/* Register Participant Type */}
      <RegisterParticipantCard />

      {/* Fix RenterCompliance Registry */}
      <FixRenterComplianceCard />

      {/* Register Renter Claims on OnchainID */}
      <RegisterRenterClaimsCard />

      {/* Review Modal */}
      {showReviewModal && selectedKYC && (
        <KYCReviewModal
          kyc={selectedKYC}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedKYC(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

// Authorize Vehicle Operator Card
function AuthorizeOperatorCard() {
  const [operatorAddress, setOperatorAddress] = useState("");
  const vehicleNFT = useVehicleNFT();

  const {
    data: hash,
    writeContract,
    isPending,
    error,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Check current operator status for the entered address
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(operatorAddress);
  const { data: isAlreadyOperator } = useReadContract({
    address: vehicleNFT.address,
    abi: vehicleNFT.abi,
    functionName: "operators",
    args: isValidAddress ? [operatorAddress as `0x${string}`] : undefined,
    query: { enabled: isValidAddress },
  });

  const handleAuthorize = () => {
    if (!isValidAddress) {
      toast.error("Please enter a valid wallet address");
      return;
    }
    writeContract({
      address: vehicleNFT.address,
      abi: vehicleNFT.abi,
      functionName: "setOperator",
      args: [operatorAddress as `0x${string}`, true],
    });
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Wallet authorized as vehicle operator!");
      setOperatorAddress("");
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error) {
      console.error("setOperator error:", error);
      toast.error("Failed to authorize operator. Make sure your wallet is the contract owner.");
    }
  }, [error]);

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <Heading as="h2" className="mb-2">
          Authorize Vehicle Operator
        </Heading>
        <Paragraph className="text-sm text-gray-600 mb-4">
          Authorize a rentor's wallet as a vehicle operator on VehicleNFT. This allows them to register their vehicles on-chain.
          Your connected wallet must be the VehicleNFT contract owner.
        </Paragraph>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <Input
              placeholder="0x... rentor wallet address"
              value={operatorAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOperatorAddress(e.target.value)}
              className="font-mono text-sm"
            />
            {isValidAddress && isAlreadyOperator === true && (
              <p className="text-xs text-green-600 mt-1">This address is already an authorized operator.</p>
            )}
            {isValidAddress && isAlreadyOperator === false && (
              <p className="text-xs text-amber-600 mt-1">This address is not yet an operator.</p>
            )}
          </div>
          <Button
            onClick={handleAuthorize}
            disabled={!isValidAddress || isPending || isConfirming || isAlreadyOperator === true}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending
              ? "Confirm in Wallet..."
              : isConfirming
              ? "Confirming..."
              : "Authorize"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// KYC Review Modal Component
function KYCReviewModal({
  kyc,
  onClose,
  onApprove,
  onReject,
}: {
  kyc: KYCSubmission;
  onClose: () => void;
  onApprove: (kycId: string, notes: string) => void;
  onReject: (kycId: string, reason: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showOperatorStep, setShowOperatorStep] = useState(false);

  // VehicleNFT operator authorization (for rentors)
  const vehicleNFT = useVehicleNFT();
  const {
    data: operatorHash,
    writeContract: writeSetOperator,
    isPending: isSettingOperator,
    error: operatorError,
  } = useWriteContract();
  const { isLoading: isOperatorConfirming, isSuccess: operatorSuccess } =
    useWaitForTransactionReceipt({ hash: operatorHash });

  const handleApproveClick = async () => {
    setIsApproving(true);
    await onApprove(kyc._id, notes);
    setIsApproving(false);

    // After approving a rentor with a wallet, show the operator authorization step
    if (kyc.roleType === "rentor" && kyc.user.walletAddress) {
      setShowOperatorStep(true);
    }
  };

  const handleAuthorizeOperator = () => {
    if (!kyc.user.walletAddress) return;
    writeSetOperator({
      address: vehicleNFT.address,
      abi: vehicleNFT.abi,
      functionName: "setOperator",
      args: [kyc.user.walletAddress as `0x${string}`, true],
    });
  };

  useEffect(() => {
    if (operatorSuccess) {
      toast.success(`${kyc.user.name} authorized as vehicle operator on-chain!`);
    }
  }, [operatorSuccess]);

  useEffect(() => {
    if (operatorError) {
      console.error("setOperator error:", operatorError);
      toast.error("Failed to authorize operator. Make sure you are the contract owner.");
    }
  }, [operatorError]);

  const handleRejectClick = async () => {
    setIsRejecting(true);
    await onReject(kyc._id, rejectionReason);
    setIsRejecting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <Heading as="h2" className="mb-2">
                KYC Review: {kyc.user.name}
              </Heading>
              <Paragraph className="text-sm text-gray-600">{kyc.user.email}</Paragraph>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 transition-colors"
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
          </div>

          {/* User Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-700">Role Type</p>
              <Badge variant="default">{kyc.roleType}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Status</p>
              <Badge variant="warning">{kyc.status}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Submitted</p>
              <p className="text-sm text-gray-900">{formatDate(kyc.submittedAt)}</p>
            </div>
            {kyc.user.walletAddress && (
              <div>
                <p className="text-sm font-medium text-gray-700">Wallet Address</p>
                <p className="text-sm text-gray-900 font-mono">
                  {kyc.user.walletAddress.slice(0, 6)}...{kyc.user.walletAddress.slice(-4)}
                </p>
              </div>
            )}
          </div>

          {/* Personal Information */}
          {kyc.personalInfo && (
            <div className="mb-6">
              <Heading as="h3" className="mb-3">
                Personal Information
              </Heading>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Full Name</p>
                  <p className="text-sm text-gray-900">{kyc.personalInfo.fullName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Nationality</p>
                  <p className="text-sm text-gray-900">{kyc.personalInfo.nationality}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Occupation</p>
                  <p className="text-sm text-gray-900">{kyc.personalInfo.occupation}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Date of Birth</p>
                  <p className="text-sm text-gray-900">
                    {kyc.personalInfo.dateOfBirth
                      ? formatDate(kyc.personalInfo.dateOfBirth)
                      : "N/A"}
                  </p>
                </div>
                {kyc.personalInfo.address && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="text-sm text-gray-900">
                      {kyc.personalInfo.address.street}, {kyc.personalInfo.address.city},{" "}
                      {kyc.personalInfo.address.state} {kyc.personalInfo.address.postalCode},{" "}
                      {kyc.personalInfo.address.country}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business Information (for rentors) */}
          {kyc.businessInfo && (
            <div className="mb-6">
              <Heading as="h3" className="mb-3">
                Business Information
              </Heading>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Business Name</p>
                  <p className="text-sm text-gray-900">{kyc.businessInfo.businessName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Business Type</p>
                  <p className="text-sm text-gray-900">{kyc.businessInfo.businessType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Registration Number</p>
                  <p className="text-sm text-gray-900">
                    {kyc.businessInfo.registrationNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Years in Business</p>
                  <p className="text-sm text-gray-900">{kyc.businessInfo.yearsInBusiness}</p>
                </div>
              </div>
            </div>
          )}

          {/* Investor Information (for investors) */}
          {kyc.investorInfo && (
            <div className="mb-6">
              <Heading as="h3" className="mb-3">
                Investor Information
              </Heading>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Accreditation Type</p>
                  <p className="text-sm text-gray-900">
                    {kyc.investorInfo.accreditationType}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Investment Experience</p>
                  <p className="text-sm text-gray-900">
                    {kyc.investorInfo.investmentExperience}
                  </p>
                </div>
              </div>
            </div>
          )}

          {kyc.renterInfo && (
            <div className="mb-6">
              <Heading as="h3" className="mb-3">
                Renter Information
              </Heading>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Driver&apos;s License Number</p>
                  <p className="text-sm text-gray-900">
                    {kyc.renterInfo.driverLicenseNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">License Expiry</p>
                  <p className="text-sm text-gray-900">
                    {kyc.renterInfo.driverLicenseExpiry
                      ? new Date(kyc.renterInfo.driverLicenseExpiry).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Issuing State</p>
                  <p className="text-sm text-gray-900">
                    {kyc.renterInfo.driverLicenseIssuingState || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <p className="text-sm text-gray-900">
                    {kyc.renterInfo.phone || "—"}
                  </p>
                </div>
                {kyc.renterInfo.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-900">{kyc.renterInfo.email}</p>
                  </div>
                )}
                {kyc.renterInfo.insuranceProvider && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Insurance Provider</p>
                    <p className="text-sm text-gray-900">{kyc.renterInfo.insuranceProvider}</p>
                  </div>
                )}
                {kyc.renterInfo.insurancePolicyNumber && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Policy Number</p>
                    <p className="text-sm text-gray-900">{kyc.renterInfo.insurancePolicyNumber}</p>
                  </div>
                )}
                {kyc.renterInfo.insuranceExpiry && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Insurance Expiry</p>
                    <p className="text-sm text-gray-900">
                      {new Date(kyc.renterInfo.insuranceExpiry).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="mb-6">
            <Heading as="h3" className="mb-3">
              Uploaded Documents
            </Heading>
            <div className="space-y-3">
              {kyc.documents?.primaryDocument && (
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Primary Document (ID)</p>
                    <p className="text-xs text-gray-600">
                      {kyc.documents.primaryDocument.originalName} (
                      {(kyc.documents.primaryDocument.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_BASE_URL}${kyc.documents.primaryDocument.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View Document
                  </a>
                </div>
              )}
              {kyc.documents?.proofOfAddress && (
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Proof of Address</p>
                    <p className="text-xs text-gray-600">
                      {kyc.documents.proofOfAddress.originalName} (
                      {(kyc.documents.proofOfAddress.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_BASE_URL}${kyc.documents.proofOfAddress.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View Document
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Review Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Notes (Optional)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              placeholder="Add notes about this review..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Rejection Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason (if rejecting)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={3}
              placeholder="Provide a reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          {/* Operator Authorization Step (after approving a rentor) */}
          {showOperatorStep && kyc.user.walletAddress && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Heading as="h3" className="mb-2 text-green-900">
                KYC Approved — Authorize Vehicle Registration
              </Heading>
              <Paragraph className="text-sm text-green-800 mb-3">
                This rentor needs to be authorized as an operator on VehicleNFT so they can register their vehicles on-chain.
                Click below to send the <code className="bg-green-100 px-1 rounded">setOperator</code> transaction.
              </Paragraph>
              <p className="text-xs text-green-700 mb-3 font-mono">
                Wallet: {kyc.user.walletAddress}
              </p>
              {operatorSuccess ? (
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <span>&#10003;</span> Operator authorized on-chain!
                  <Button variant="outline" size="sm" onClick={onClose} className="ml-auto">
                    Done
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={handleAuthorizeOperator}
                    disabled={isSettingOperator || isOperatorConfirming}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSettingOperator
                      ? "Confirm in Wallet..."
                      : isOperatorConfirming
                      ? "Confirming..."
                      : "Authorize as Operator"}
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Skip (Do Later)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!showOperatorStep && (
          <div className="flex gap-4">
            <Button
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleApproveClick}
              disabled={isApproving || isRejecting}
            >
              {isApproving ? "Approving..." : "Approve KYC"}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleRejectClick}
              disabled={isApproving || isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? "Rejecting..." : "Reject KYC"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isApproving || isRejecting}>
              Cancel
            </Button>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Register Identity on IdentityRegistry
function RegisterIdentityCard() {
  const [userAddress, setUserAddress] = useState("");
  const [countryCode, setCountryCode] = useState("1");
  const identityRegistry = useIdentityRegistry();

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(userAddress);

  // Check if already verified
  const { data: isAlreadyVerified } = useReadContract({
    address: identityRegistry.address,
    abi: identityRegistry.abi,
    functionName: "isVerified",
    args: isValidAddress ? [userAddress as `0x${string}`] : undefined,
    query: { enabled: isValidAddress },
  });

  const handleRegister = () => {
    if (!isValidAddress) {
      toast.error("Please enter a valid wallet address");
      return;
    }
    // registerIdentity(user, identity, country)
    // Use the user address as the identity address (simplified — no separate OnchainID contract)
    writeContract({
      address: identityRegistry.address,
      abi: identityRegistry.abi,
      functionName: "registerIdentity",
      args: [
        userAddress as `0x${string}`,
        userAddress as `0x${string}`,
        parseInt(countryCode) || 1,
      ],
    });
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Identity registered on-chain!");
      setUserAddress("");
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error) {
      console.error("registerIdentity error:", error);
      const msg = error.message || "";
      if (msg.includes("agent") || msg.includes("Unauthorized")) {
        toast.error("Your wallet is not an authorized agent. Call addAgent() first as the contract owner.");
      } else {
        toast.error("Failed to register identity. Check console for details.");
      }
    }
  }, [error]);

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <Heading as="h2" className="mb-2">
          Register Identity (IdentityRegistry)
        </Heading>
        <Paragraph className="text-sm text-gray-600 mb-4">
          Register a user&apos;s wallet in the IdentityRegistry so they pass on-chain identity verification.
          Required for both investors and rentors before they can transact.
        </Paragraph>
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <Input
                placeholder="0x... user wallet address"
                value={userAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserAddress(e.target.value)}
                className="font-mono text-sm"
              />
              {isValidAddress && isAlreadyVerified === true && (
                <p className="text-xs text-green-600 mt-1">This address is already verified on-chain.</p>
              )}
              {isValidAddress && isAlreadyVerified === false && (
                <p className="text-xs text-amber-600 mt-1">This address is NOT verified on-chain.</p>
              )}
            </div>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-44"
            >
              <option value="1">US (1)</option>
              <option value="44">UK (44)</option>
              <option value="49">Germany (49)</option>
              <option value="33">France (33)</option>
              <option value="81">Japan (81)</option>
              <option value="86">China (86)</option>
              <option value="91">India (91)</option>
              <option value="61">Australia (61)</option>
              <option value="55">Brazil (55)</option>
              <option value="7">Russia (7)</option>
              <option value="82">South Korea (82)</option>
              <option value="39">Italy (39)</option>
              <option value="34">Spain (34)</option>
              <option value="1001">Canada (1001)</option>
              <option value="52">Mexico (52)</option>
              <option value="65">Singapore (65)</option>
              <option value="971">UAE (971)</option>
              <option value="966">Saudi Arabia (966)</option>
              <option value="41">Switzerland (41)</option>
              <option value="31">Netherlands (31)</option>
            </select>
          </div>
          <Button
            onClick={handleRegister}
            disabled={!isValidAddress || isPending || isConfirming || isAlreadyVerified === true}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPending
              ? "Confirm in Wallet..."
              : isConfirming
              ? "Confirming..."
              : "Register Identity"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Register Participant Type on ParticipantTypeRegistry
function RegisterParticipantCard() {
  const [participantAddress, setParticipantAddress] = useState("");
  const [roleType, setRoleType] = useState<"rentor" | "investor" | "renter">("rentor");
  const participantRegistry = useParticipantTypeRegistry();

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(participantAddress);

  // Check if already registered
  const { data: isRegistered } = useReadContract({
    address: participantRegistry.address,
    abi: participantRegistry.abi,
    functionName: "isParticipantRegistered",
    args: isValidAddress ? [participantAddress as `0x${string}`] : undefined,
    query: { enabled: isValidAddress },
  });
  const { data: isRentorOnChain } = useReadContract({
    address: participantRegistry.address,
    abi: participantRegistry.abi,
    functionName: "isRentor",
    args: isValidAddress ? [participantAddress as `0x${string}`] : undefined,
    query: { enabled: isValidAddress },
  });
  const { data: isInvestorOnChain } = useReadContract({
    address: participantRegistry.address,
    abi: participantRegistry.abi,
    functionName: "isInvestor",
    args: isValidAddress ? [participantAddress as `0x${string}`] : undefined,
    query: { enabled: isValidAddress },
  });
  const { data: isRenterOnChain } = useReadContract({
    address: participantRegistry.address,
    abi: participantRegistry.abi,
    functionName: "isRenter",
    args: isValidAddress ? [participantAddress as `0x${string}`] : undefined,
    query: { enabled: isValidAddress },
  });

  const handleRegister = () => {
    if (!isValidAddress) {
      toast.error("Please enter a valid wallet address");
      return;
    }

    if (!isRegistered) {
      // First registration: registerParticipant with the right type
      // ParticipantType enum: 0=NONE, 1=INVESTOR_RETAIL, 2=INVESTOR_INSTITUTIONAL, 3=INVESTOR_STRATEGIC, 4=RENTER, 5=RENTOR, 6=MULTI_ROLE
      const typeValue = roleType === "rentor" ? 5 : roleType === "renter" ? 4 : 1;
      writeContract({
        address: participantRegistry.address,
        abi: participantRegistry.abi,
        functionName: "registerParticipant",
        args: [participantAddress as `0x${string}`, typeValue],
      });
    } else {
      // Already registered — add the role
      const fnName = roleType === "rentor" ? "addRentorRole" : roleType === "renter" ? "addRenterRole" : "addInvestorRole";
      writeContract({
        address: participantRegistry.address,
        abi: participantRegistry.abi,
        functionName: fnName,
        args: [participantAddress as `0x${string}`],
      });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success(`Participant ${roleType} role registered on-chain!`);
      setParticipantAddress("");
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error) {
      console.error("registerParticipant error:", error);
      const msg = error.message || "";
      if (msg.includes("operator") || msg.includes("Unauthorized")) {
        toast.error("Your wallet is not an authorized operator. Call setAuthorizedOperator() first.");
      } else {
        toast.error("Failed to register participant. Check console for details.");
      }
    }
  }, [error]);

  const alreadyHasRole = roleType === "rentor" ? isRentorOnChain === true : roleType === "renter" ? isRenterOnChain === true : isInvestorOnChain === true;

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <Heading as="h2" className="mb-2">
          Register Participant Type (ParticipantTypeRegistry)
        </Heading>
        <Paragraph className="text-sm text-gray-600 mb-4">
          Register a user as a rentor, renter, or investor in the ParticipantTypeRegistry.
          This is required alongside identity verification for on-chain transactions.
        </Paragraph>
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <Input
                placeholder="0x... participant wallet address"
                value={participantAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParticipantAddress(e.target.value)}
                className="font-mono text-sm"
              />
              {isValidAddress && (
                <div className="flex gap-3 mt-1 text-xs">
                  <span className={isRegistered ? "text-green-600" : "text-amber-600"}>
                    {isRegistered ? "Registered" : "Not registered"}
                  </span>
                  <span className={isRentorOnChain === true ? "text-green-600" : "text-gray-400"}>
                    {isRentorOnChain === true ? "Rentor" : "No rentor role"}
                  </span>
                  <span className={isRenterOnChain === true ? "text-green-600" : "text-gray-400"}>
                    {isRenterOnChain === true ? "Renter" : "No renter role"}
                  </span>
                  <span className={isInvestorOnChain === true ? "text-green-600" : "text-gray-400"}>
                    {isInvestorOnChain === true ? "Investor" : "No investor role"}
                  </span>
                </div>
              )}
            </div>
            <select
              value={roleType}
              onChange={(e) => setRoleType(e.target.value as "rentor" | "investor" | "renter")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="rentor">Rentor</option>
              <option value="renter">Renter</option>
              <option value="investor">Investor</option>
            </select>
          </div>
          <Button
            onClick={handleRegister}
            disabled={!isValidAddress || isPending || isConfirming || alreadyHasRole}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isPending
              ? "Confirm in Wallet..."
              : isConfirming
              ? "Confirming..."
              : alreadyHasRole
              ? `Already has ${roleType} role`
              : !isRegistered
              ? `Register as ${roleType}`
              : `Add ${roleType} role`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * FixRenterComplianceCard — Detects and fixes IdentityRegistry mismatch
 * in the RenterCompliance contract (deployed with old registry address).
 */
function FixRenterComplianceCard() {
  const { address: rcAddress, abi: rcAbi } = useRenterComplianceContract();
  const expectedIR = SEPOLIA_CONTRACTS.identityRegistry;

  // Read current identityRegistry from RenterCompliance contract
  const { data: currentIR, isLoading: isReadingIR } = useReadContract({
    address: rcAddress,
    abi: rcAbi,
    functionName: "identityRegistry",
  });

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const currentIRAddr = currentIR as `0x${string}` | undefined;
  const isMismatch = currentIRAddr && currentIRAddr.toLowerCase() !== expectedIR.toLowerCase();
  const isMatch = currentIRAddr && currentIRAddr.toLowerCase() === expectedIR.toLowerCase();

  useEffect(() => {
    if (isSuccess) {
      toast.success("RenterCompliance IdentityRegistry updated!");
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error) {
      console.error("setIdentityRegistry error:", error);
      const msg = error.message || "";
      if (msg.includes("owner") || msg.includes("Ownable")) {
        toast.error("Only the contract owner can update the IdentityRegistry.");
      } else {
        toast.error("Failed to update IdentityRegistry. Check console.");
      }
    }
  }, [error]);

  const handleFix = () => {
    writeContract({
      address: rcAddress,
      abi: rcAbi,
      functionName: "setIdentityRegistry",
      args: [expectedIR],
    });
  };

  // Don't show if addresses match
  if (isReadingIR || isMatch) return null;

  return (
    <Card className="mt-8 border-2 border-red-300">
      <CardContent className="p-6">
        <Heading as="h2" className="mb-2 text-red-700">
          RenterCompliance Registry Mismatch
        </Heading>
        <Paragraph className="text-sm text-red-600 mb-4">
          The RenterCompliance contract is pointing to a different IdentityRegistry than the one used
          by this admin panel. Renter compliance checks will fail until this is fixed.
        </Paragraph>

        {isMismatch && (
          <div className="bg-red-50 rounded-lg p-4 space-y-2 text-xs font-mono mb-4">
            <div>
              <span className="text-gray-600">Current (wrong): </span>
              <span className="text-red-700">{currentIRAddr}</span>
            </div>
            <div>
              <span className="text-gray-600">Expected: </span>
              <span className="text-green-700">{expectedIR}</span>
            </div>
          </div>
        )}

        <Button
          onClick={handleFix}
          disabled={isPending || isConfirming || isSuccess}
          className="bg-red-600 hover:bg-red-700"
        >
          {isPending
            ? "Confirm in Wallet..."
            : isConfirming
            ? "Confirming..."
            : isSuccess
            ? "Fixed!"
            : "Fix IdentityRegistry Address"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Inline ABIs for OnchainIDFactory and OnchainID (no dedicated frontend ABI files)
const FACTORY_ABI = [
  {
    type: "function" as const,
    name: "deployOnchainIDWithKey" as const,
    inputs: [
      { name: "_owner", type: "address" as const, internalType: "address" as const },
      { name: "_managementKey", type: "address" as const, internalType: "address" as const },
      { name: "_salt", type: "bytes32" as const, internalType: "bytes32" as const },
    ],
    outputs: [{ name: "identity", type: "address" as const, internalType: "address" as const }],
    stateMutability: "payable" as const,
  },
  {
    type: "function" as const,
    name: "getIdentityByOwner" as const,
    inputs: [{ name: "_owner", type: "address" as const, internalType: "address" as const }],
    outputs: [{ name: "", type: "address" as const, internalType: "address" as const }],
    stateMutability: "view" as const,
  },
  {
    type: "function" as const,
    name: "deploymentFee" as const,
    inputs: [],
    outputs: [{ name: "", type: "uint256" as const, internalType: "uint256" as const }],
    stateMutability: "view" as const,
  },
] as const;

const ONCHAIN_ID_ABI = [
  {
    type: "function" as const,
    name: "addClaim" as const,
    inputs: [
      { name: "_topic", type: "uint256" as const, internalType: "uint256" as const },
      { name: "_scheme", type: "uint256" as const, internalType: "uint256" as const },
      { name: "_issuer", type: "address" as const, internalType: "address" as const },
      { name: "_signature", type: "bytes" as const, internalType: "bytes" as const },
      { name: "_data", type: "bytes" as const, internalType: "bytes" as const },
      { name: "_uri", type: "string" as const, internalType: "string" as const },
    ],
    outputs: [{ name: "claimId", type: "bytes32" as const, internalType: "bytes32" as const }],
    stateMutability: "nonpayable" as const,
  },
  {
    type: "function" as const,
    name: "getClaimIdsByTopic" as const,
    inputs: [{ name: "_topic", type: "uint256" as const, internalType: "uint256" as const }],
    outputs: [{ name: "", type: "bytes32[]" as const, internalType: "bytes32[]" as const }],
    stateMutability: "view" as const,
  },
] as const;

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

// Claim topic constants matching ClaimTopics.sol
const CLAIM_TOPICS = {
  DRIVER_LICENSE_VALID: BigInt(4),
  INSURANCE_VERIFIED: BigInt(5),
  CREDIT_SCORE_RANGE: BigInt(6),
} as const;

const CLAIM_TOPIC_NAMES: Record<string, string> = {
  "4": "Driver License",
  "5": "Insurance",
  "6": "Credit Score",
};

/**
 * RegisterRenterClaimsCard — Multi-step wizard to deploy OnchainID,
 * update IdentityRegistry, and register renter claims (driver license,
 * insurance, credit score) required by RenterCompliance contract.
 */
function RegisterRenterClaimsCard() {
  const [renterAddress, setRenterAddress] = useState("");
  const { address: adminAddress } = useAccount();
  const identityRegistry = useIdentityRegistry();

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(renterAddress);

  // ── Read current state ──────────────────────────────────────
  const { data: currentIdentity, refetch: refetchIdentity } = useReadContract({
    address: identityRegistry.address,
    abi: identityRegistry.abi,
    functionName: "identity",
    args: isValidAddress ? [renterAddress as `0x${string}`] : undefined,
    query: { enabled: isValidAddress },
  });

  const { data: factoryIdentity, refetch: refetchFactory } = useReadContract({
    address: SEPOLIA_CONTRACTS.onchainIDFactory as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: "getIdentityByOwner",
    args: isValidAddress ? [renterAddress as `0x${string}`] : undefined,
    query: { enabled: isValidAddress },
  });

  const { data: deploymentFee } = useReadContract({
    address: SEPOLIA_CONTRACTS.onchainIDFactory as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: "deploymentFee",
  });

  // ── Derive state ────────────────────────────────────────────
  const currentId = currentIdentity as string | undefined;
  const factoryId = factoryIdentity as string | undefined;
  const hasIdentity = !!currentId && currentId !== ZERO_ADDR;
  const isEOA = hasIdentity && currentId?.toLowerCase() === renterAddress.toLowerCase();
  const hasFactoryId = !!factoryId && factoryId !== ZERO_ADDR;
  const onchainIdAddr = hasFactoryId ? (factoryId as `0x${string}`) : undefined;
  const registryCorrect = hasIdentity && !isEOA && hasFactoryId &&
    currentId?.toLowerCase() === factoryId?.toLowerCase();

  // ── Read claims on OnchainID ────────────────────────────────
  const claimCheckAddr = registryCorrect ? onchainIdAddr : undefined;

  const { data: licenseClaimIds, refetch: refetchLicense } = useReadContract({
    address: claimCheckAddr,
    abi: ONCHAIN_ID_ABI,
    functionName: "getClaimIdsByTopic",
    args: claimCheckAddr ? [CLAIM_TOPICS.DRIVER_LICENSE_VALID] : undefined,
    query: { enabled: !!claimCheckAddr },
  });
  const { data: insuranceClaimIds, refetch: refetchInsurance } = useReadContract({
    address: claimCheckAddr,
    abi: ONCHAIN_ID_ABI,
    functionName: "getClaimIdsByTopic",
    args: claimCheckAddr ? [CLAIM_TOPICS.INSURANCE_VERIFIED] : undefined,
    query: { enabled: !!claimCheckAddr },
  });
  const { data: creditClaimIds, refetch: refetchCredit } = useReadContract({
    address: claimCheckAddr,
    abi: ONCHAIN_ID_ABI,
    functionName: "getClaimIdsByTopic",
    args: claimCheckAddr ? [CLAIM_TOPICS.CREDIT_SCORE_RANGE] : undefined,
    query: { enabled: !!claimCheckAddr },
  });

  const hasLicense = ((licenseClaimIds as `0x${string}`[]) || []).length > 0;
  const hasInsurance = ((insuranceClaimIds as `0x${string}`[]) || []).length > 0;
  const hasCredit = ((creditClaimIds as `0x${string}`[]) || []).length > 0;
  const allClaimsPresent = hasLicense && hasInsurance && hasCredit;

  // ── Determine what steps are needed ─────────────────────────
  const needsDeploy = isValidAddress && !hasFactoryId;
  const needsDeleteOld = isValidAddress && hasFactoryId && hasIdentity && (isEOA || !registryCorrect);
  const needsRegister = isValidAddress && hasFactoryId && (!hasIdentity || isEOA || !registryCorrect);
  const needsClaims = isValidAddress && registryCorrect && !allClaimsPresent;

  // ── Transaction hooks (one per step) ────────────────────────
  const {
    data: deployHash, writeContract: writeDeploy,
    isPending: isDeploying, error: deployError,
  } = useWriteContract();
  const { isLoading: isDeployConfirming, isSuccess: deploySuccess } =
    useWaitForTransactionReceipt({ hash: deployHash });

  const {
    data: deleteHash, writeContract: writeDelete,
    isPending: isDeletingId, error: deleteError,
  } = useWriteContract();
  const { isLoading: isDeleteConfirming, isSuccess: deleteSuccess } =
    useWaitForTransactionReceipt({ hash: deleteHash });

  const {
    data: regHash, writeContract: writeRegister,
    isPending: isRegisteringId, error: registerError,
  } = useWriteContract();
  const { isLoading: isRegConfirming, isSuccess: registerSuccess } =
    useWaitForTransactionReceipt({ hash: regHash });

  const {
    data: claimHash, writeContract: writeClaim,
    isPending: isClaiming, error: claimError,
  } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: claimSuccess } =
    useWaitForTransactionReceipt({ hash: claimHash });

  // ── Refetch after each step ─────────────────────────────────
  useEffect(() => {
    if (deploySuccess) { toast.success("OnchainID deployed!"); refetchFactory(); }
  }, [deploySuccess]);
  useEffect(() => {
    if (deleteSuccess) { toast.success("Old identity deleted from registry"); refetchIdentity(); }
  }, [deleteSuccess]);
  useEffect(() => {
    if (registerSuccess) { toast.success("OnchainID registered in IdentityRegistry!"); refetchIdentity(); }
  }, [registerSuccess]);
  useEffect(() => {
    if (claimSuccess) {
      toast.success("Claim registered on OnchainID!");
      refetchLicense(); refetchInsurance(); refetchCredit();
    }
  }, [claimSuccess]);

  // ── Error toasts ────────────────────────────────────────────
  useEffect(() => { if (deployError) toast.error("Deploy failed: " + (deployError.message?.slice(0, 120) || "Unknown")); }, [deployError]);
  useEffect(() => { if (deleteError) toast.error("Delete failed: " + (deleteError.message?.slice(0, 120) || "Unknown")); }, [deleteError]);
  useEffect(() => { if (registerError) toast.error("Register failed: " + (registerError.message?.slice(0, 120) || "Unknown")); }, [registerError]);
  useEffect(() => { if (claimError) toast.error("Claim failed: " + (claimError.message?.slice(0, 120) || "Unknown")); }, [claimError]);

  // ── Action handlers ─────────────────────────────────────────
  const handleDeploy = () => {
    if (!adminAddress) { toast.error("Connect admin wallet first"); return; }
    const salt = keccak256(toHex(renterAddress));
    writeDeploy({
      address: SEPOLIA_CONTRACTS.onchainIDFactory as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: "deployOnchainIDWithKey",
      args: [renterAddress as `0x${string}`, adminAddress, salt],
      value: ((deploymentFee as bigint) || BigInt(0)) + BigInt(1),
    });
  };

  const handleDeleteIdentity = () => {
    writeDelete({
      address: identityRegistry.address,
      abi: identityRegistry.abi,
      functionName: "deleteIdentity",
      args: [renterAddress as `0x${string}`],
    });
  };

  const handleRegisterIdentity = () => {
    if (!onchainIdAddr) { toast.error("No OnchainID found"); return; }
    writeRegister({
      address: identityRegistry.address,
      abi: identityRegistry.abi,
      functionName: "registerIdentity",
      args: [renterAddress as `0x${string}`, onchainIdAddr, 1], // country=1 (US)
    });
  };

  const handleAddClaim = (topic: bigint) => {
    if (!onchainIdAddr || !adminAddress) return;
    const name = CLAIM_TOPIC_NAMES[topic.toString()] || "claim";
    writeClaim({
      address: onchainIdAddr,
      abi: ONCHAIN_ID_ABI,
      functionName: "addClaim",
      args: [topic, BigInt(1), adminAddress, "0x", "0x", `regshield:${name.toLowerCase().replace(" ", "_")}`],
    });
  };

  // ── Busy states ─────────────────────────────────────────────
  const anyPending = isDeploying || isDeployConfirming || isDeletingId || isDeleteConfirming ||
    isRegisteringId || isRegConfirming || isClaiming || isClaimConfirming;

  const btnLabel = (pending: boolean, confirming: boolean, label: string) =>
    pending ? "Confirm in Wallet..." : confirming ? "Confirming..." : label;

  return (
    <Card className="mt-8 border-2 border-indigo-200">
      <CardContent className="p-6">
        <Heading as="h2" className="mb-2">
          Register Renter Claims (OnchainID)
        </Heading>
        <Paragraph className="text-sm text-gray-600 mb-4">
          Deploy an OnchainID for the renter and register driver license, insurance, and credit score
          claims. These claims are required by the RenterCompliance contract for on-chain rental payments.
        </Paragraph>

        {/* Address input */}
        <div className="mb-4">
          <Input
            placeholder="0x... renter wallet address"
            value={renterAddress}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenterAddress(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        {/* Status dashboard */}
        {isValidAddress && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">OnchainID Deployed</span>
              <Badge variant={hasFactoryId ? "success" : "warning"}>
                {hasFactoryId ? "Yes" : "No"}
              </Badge>
            </div>
            {hasFactoryId && (
              <div className="flex justify-between">
                <span className="text-gray-600">OnchainID Address</span>
                <span className="font-mono text-xs text-gray-700">
                  {onchainIdAddr?.slice(0, 10)}...{onchainIdAddr?.slice(-6)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Identity Registry</span>
              <Badge variant={registryCorrect ? "success" : hasIdentity ? (isEOA ? "error" : "warning") : "warning"}>
                {registryCorrect ? "Correct" : isEOA ? "EOA (needs update)" : hasIdentity ? "Wrong address" : "Not registered"}
              </Badge>
            </div>
            {registryCorrect && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver License Claim (4)</span>
                  <Badge variant={hasLicense ? "success" : "warning"}>
                    {hasLicense ? "Present" : "Missing"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Insurance Claim (5)</span>
                  <Badge variant={hasInsurance ? "success" : "warning"}>
                    {hasInsurance ? "Present" : "Missing"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Credit Score Claim (6)</span>
                  <Badge variant={hasCredit ? "success" : "warning"}>
                    {hasCredit ? "Present" : "Missing"}
                  </Badge>
                </div>
              </>
            )}
          </div>
        )}

        {/* All done */}
        {isValidAddress && registryCorrect && allClaimsPresent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-medium">
            All renter claims are registered. This renter can now pass on-chain compliance checks.
          </div>
        )}

        {/* Action buttons */}
        {isValidAddress && (
          <div className="space-y-3 mt-4">
            {/* Step 1: Deploy OnchainID */}
            {needsDeploy && (
              <div>
                <Paragraph className="text-xs text-gray-500 mb-1">
                  Step 1: Deploy an OnchainID contract for this renter
                </Paragraph>
                <Button
                  onClick={handleDeploy}
                  disabled={anyPending || !adminAddress}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {btnLabel(isDeploying, isDeployConfirming, "Deploy OnchainID")}
                </Button>
              </div>
            )}

            {/* Step 2a: Delete old EOA identity */}
            {!needsDeploy && needsDeleteOld && !deleteSuccess && (
              <div>
                <Paragraph className="text-xs text-gray-500 mb-1">
                  Step 2a: Remove old identity (EOA) from registry
                </Paragraph>
                <Button
                  onClick={handleDeleteIdentity}
                  disabled={anyPending}
                  variant="destructive"
                >
                  {btnLabel(isDeletingId, isDeleteConfirming, "Delete Old Identity")}
                </Button>
              </div>
            )}

            {/* Step 2b: Register new OnchainID */}
            {!needsDeploy && needsRegister && (!needsDeleteOld || deleteSuccess) && (
              <div>
                <Paragraph className="text-xs text-gray-500 mb-1">
                  Step 2b: Register OnchainID in IdentityRegistry
                </Paragraph>
                <Button
                  onClick={handleRegisterIdentity}
                  disabled={anyPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {btnLabel(isRegisteringId, isRegConfirming, "Register OnchainID")}
                </Button>
              </div>
            )}

            {/* Step 3: Register claims */}
            {needsClaims && (
              <div>
                <Paragraph className="text-xs text-gray-500 mb-1">
                  Step 3: Register missing claims on OnchainID
                </Paragraph>
                <div className="flex gap-2 flex-wrap">
                  {!hasLicense && (
                    <Button
                      onClick={() => handleAddClaim(CLAIM_TOPICS.DRIVER_LICENSE_VALID)}
                      disabled={anyPending}
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isClaiming || isClaimConfirming ? "Processing..." : "Add Driver License"}
                    </Button>
                  )}
                  {!hasInsurance && (
                    <Button
                      onClick={() => handleAddClaim(CLAIM_TOPICS.INSURANCE_VERIFIED)}
                      disabled={anyPending}
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isClaiming || isClaimConfirming ? "Processing..." : "Add Insurance"}
                    </Button>
                  )}
                  {!hasCredit && (
                    <Button
                      onClick={() => handleAddClaim(CLAIM_TOPICS.CREDIT_SCORE_RANGE)}
                      disabled={anyPending}
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isClaiming || isClaimConfirming ? "Processing..." : "Add Credit Score"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
