import apiClient from "./axios";

export interface KYCDocument {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  url: string;
}

export interface KYCPersonalInfo {
  fullName: string;
  dateOfBirth: Date;
  nationality: string;
  occupation: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

export interface KYCInvestorInfo {
  accreditationType: "retail" | "accredited" | "institutional";
  annualIncome: number;
  netWorth: number;
  investmentExperience: string;
}

export interface KYCBusinessInfo {
  businessName: string;
  businessType: string;
  registrationNumber: string;
  taxId: string;
  yearsInBusiness: number;
}

export interface KYCSubmission {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    walletAddress?: string;
  };
  roleType: "investor" | "rentor";
  status: "pending" | "under_review" | "approved" | "rejected" | "expired";
  documents?: {
    primaryDocument?: KYCDocument;
    proofOfAddress?: KYCDocument;
    additionalDocuments?: KYCDocument[];
  };
  personalInfo?: KYCPersonalInfo;
  investorInfo?: KYCInvestorInfo;
  businessInfo?: KYCBusinessInfo;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  rejectionReason?: string;
  submittedAt: Date;
  expiresAt?: Date;
  blockchainStatus?: {
    isRegisteredOnChain: boolean;
    walletAddress?: string;
    identityRegistryTxHash?: string;
    registeredAt?: Date;
  };
}

export interface UpgradeRequest {
  isUpgrade: boolean;
  currentType: number;
  targetType: number;
  reason?: string;
  requestedAt?: Date;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface KYCStatus {
  hasKYC: boolean;
  status: "not_submitted" | "pending" | "under_review" | "approved" | "rejected" | "expired";
  roleType?: "investor" | "rentor";
  investorType?: number | null; // 1=RETAIL, 2=ACCREDITED, 3=INSTITUTIONAL
  submittedAt?: Date;
  reviewedAt?: Date;
  expiresAt?: Date;
  isExpired?: boolean;
  blockchainStatus?: {
    isRegisteredOnChain: boolean;
    walletAddress?: string;
    identityRegistryTxHash?: string;
  };
  rejectionReason?: string;
  upgradeRequest?: UpgradeRequest | null;
}

export const kycApi = {
  /**
   * Submit KYC documents
   */
  submit: async (formData: FormData): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post("/kyc/submit", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },

  /**
   * Get current user's KYC status
   */
  getStatus: async (): Promise<{ success: boolean; data: KYCStatus }> => {
    const { data } = await apiClient.get("/kyc/status");
    return data;
  },

  /**
   * Get all pending KYC submissions (Admin only)
   */
  getPending: async (): Promise<{ success: boolean; count: number; data: KYCSubmission[] }> => {
    const { data } = await apiClient.get("/kyc/pending");
    return data;
  },

  /**
   * Get KYC details by ID (Admin only)
   */
  getById: async (id: string): Promise<{ success: boolean; data: KYCSubmission }> => {
    const { data } = await apiClient.get(`/kyc/${id}`);
    return data;
  },

  /**
   * Approve KYC submission (Admin only)
   */
  approve: async (
    id: string,
    notes?: string,
    registerOnChain?: boolean
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post(`/kyc/${id}/approve`, {
      notes,
      registerOnChain,
    });
    return data;
  },

  /**
   * Reject KYC submission (Admin only)
   */
  reject: async (
    id: string,
    reason: string
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post(`/kyc/${id}/reject`, {
      reason,
    });
    return data;
  },

  /**
   * Get all investor users with wallet + KYC status (Admin only)
   */
  getInvestorUsers: async (): Promise<{ success: boolean; data: any[] }> => {
    const { data } = await apiClient.get("/kyc/investors");
    return data;
  },

  /**
   * Request investor type upgrade (Investor only)
   */
  requestUpgrade: async (
    formData: FormData
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post("/kyc/request-upgrade", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  },

  /**
   * Approve investor type upgrade (Admin only)
   */
  approveUpgrade: async (
    id: string
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post(`/kyc/${id}/approve-upgrade`);
    return data;
  },

  /**
   * Reject investor type upgrade (Admin only)
   */
  rejectUpgrade: async (
    id: string,
    reason: string
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post(`/kyc/${id}/reject-upgrade`, {
      reason,
    });
    return data;
  },

  /**
   * Downgrade investor type (Admin only)
   */
  downgradeInvestor: async (
    id: string,
    targetType: number
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post(`/kyc/${id}/downgrade`, {
      targetType,
    });
    return data;
  },

  /**
   * Notify investor that upgrade MultiSig wallet was created (Admin only)
   */
  notifyUpgradeWalletCreated: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(`/kyc/${id}/notify-upgrade-wallet`);
    return data;
  },

  /**
   * Update blockchain registration status (Admin only)
   */
  updateBlockchainStatus: async (
    id: string,
    walletAddress: string,
    txHash: string
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post(`/kyc/${id}/blockchain`, {
      walletAddress,
      txHash,
    });
    return data;
  },
};
