import apiClient from "./axios";
import { Investment, FundraisingCampaign as Campaign, Vehicle, Review } from "@/types";

export const investmentApi = {
  // Get marketplace (active campaigns)
  getMarketplace: async (): Promise<{ success: boolean; data: Campaign[] }> => {
    const { data } = await apiClient.get("/investments/marketplace");
    return data;
  },

  // Get rentor's own campaigns
  getRentorCampaigns: async (): Promise<{ success: boolean; data: Campaign[] }> => {
    const { data } = await apiClient.get("/investments/rentor-campaigns");
    return data;
  },

  // Create fundraising campaign
  createCampaign: async (campaignData: {
    vehicleId: string;
    targetAmount: number;
    expectedROI: number;
    duration: number;
    minInvestment: number;
    description?: string;
    fundraisingType?: string;
    rentorInvestment?: number;
    minFundingRequired?: number;
  }): Promise<{ success: boolean; data: any }> => {
    const { data } = await apiClient.post("/investments/create-campaign", campaignData);
    return data;
  },

  // Create investment (record in DB after on-chain tx)
  create: async (investmentData: {
    vehicleId: string;
    campaignId: string;
    amount: number;
    amountEth?: number;
    txHash?: string;
  }): Promise<{ success: boolean; data: Investment }> => {
    const { data } = await apiClient.post("/investments/create", investmentData);
    return data;
  },

  // Get user portfolio
  getPortfolio: async (): Promise<{
    success: boolean;
    data: {
      investments: Investment[];
      totalInvested: number;
      totalRevenue: number;
      roi: number;
    };
  }> => {
    const { data } = await apiClient.get("/investments/portfolio");
    return data;
  },

  // Get investment details
  getDetails: async (investmentId: string): Promise<{ success: boolean; data: Investment }> => {
    const { data } = await apiClient.get(`/investments/${investmentId}`);
    return data;
  },

  // Get campaign details
  getCampaign: async (campaignId: string): Promise<{ success: boolean; data: Campaign }> => {
    const { data } = await apiClient.get(`/investments/campaign/${campaignId}`);
    return data;
  },

  // Get vehicle pitch page data (vehicle + campaign + reviews)
  getVehiclePitch: async (vehicleId: string): Promise<{
    success: boolean;
    data: {
      vehicle: Vehicle;
      campaign: Campaign | null;
      investorCount: number;
      reviews: Review[];
    };
  }> => {
    const { data } = await apiClient.get(`/investments/vehicle/${vehicleId}`);
    return data;
  },

  // Cancel/delete a campaign
  cancelCampaign: async (campaignId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/investments/campaign/${campaignId}`);
    return data;
  },

  // Pause or resume a campaign
  pauseCampaign: async (campaignId: string): Promise<{ success: boolean; message: string; data: Campaign }> => {
    const { data } = await apiClient.post(`/investments/campaign/${campaignId}/pause`);
    return data;
  },

  // Update campaign details
  updateCampaign: async (
    campaignId: string,
    updates: {
      targetAmount?: number;
      expectedROI?: number;
      duration?: number;
      minInvestment?: number;
      minFundingRequired?: number;
    }
  ): Promise<{ success: boolean; message: string; data: Campaign }> => {
    const { data } = await apiClient.put(`/investments/campaign/${campaignId}`, updates);
    return data;
  },

  // Record rentor co-investment deposit (after on-chain confirmation)
  recordRentorCoInvestment: async (
    campaignId: string,
    depositData: { amount: number; txHash: string }
  ): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post(
      `/investments/campaign/${campaignId}/co-invest`,
      depositData
    );
    return data;
  },

  // --- On-chain sync endpoints ---

  // Record milestone completion
  recordMilestoneCompleted: async (
    vehicleNftId: string,
    payload: { milestoneName: string; txHash?: string }
  ): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post(
      `/investments/vehicle/${vehicleNftId}/milestone-completed`,
      payload
    );
    return data;
  },

  // Record funds released + tokens minted
  recordFundsReleased: async (
    vehicleNftId: string,
    payload: { txHash?: string }
  ): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post(
      `/investments/vehicle/${vehicleNftId}/funds-released`,
      payload
    );
    return data;
  },

  // Record revenue distribution by admin
  recordRevenueDistributed: async (
    vehicleNftId: string,
    payload: { amountEth: number; amountUsd?: number; txHash?: string }
  ): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post(
      `/investments/vehicle/${vehicleNftId}/revenue-distributed`,
      payload
    );
    return data;
  },

  // Record revenue claimed by investor
  recordRevenueClaimed: async (
    vehicleNftId: string,
    payload: { amountEth: number; amountUsd?: number; txHash?: string }
  ): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post(
      `/investments/vehicle/${vehicleNftId}/revenue-claimed`,
      payload
    );
    return data;
  },

  // Record token transfer
  recordTokenTransfer: async (payload: {
    tokenAddress: string;
    recipientAddress: string;
    amount: string;
    txHash?: string;
  }): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post("/investments/record-transfer", payload);
    return data;
  },

  // Record dispute resolution
  recordDisputeResolution: async (payload: {
    disputeId: number;
    paymentId: number;
    outcome: number;
    refundAmount: string;
    txHash?: string;
  }): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post("/investments/record-dispute-resolution", payload);
    return data;
  },
};
