"use client";

import { useState, useEffect } from "react";
import { Heading, Paragraph, Button, Card, CardContent, Badge } from "@/components/ui";
import { kycApi, type KYCSubmission } from "@/lib/api";
import { toast } from "react-hot-toast";
import { formatDate } from "@/lib/utils";

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
        return "destructive";
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

  const handleApproveClick = async () => {
    setIsApproving(true);
    await onApprove(kyc._id, notes);
    setIsApproving(false);
  };

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

          {/* Actions */}
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
        </CardContent>
      </Card>
    </div>
  );
}
