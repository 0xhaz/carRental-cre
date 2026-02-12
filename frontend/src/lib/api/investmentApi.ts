import apiClient from "./axios";
import { Investment, Campaign } from "@/src/types";

export const investmentApi = {
  // Get marketplace (active campaigns)
  getMarketplace: async (): Promise<{ success: boolean; data: Campaign[] }> => {
    const { data } = await apiClient.get("/investments/marketplace");
    return data;
  },

  // Create investment
  create: async (investmentData: {
    vehicleId: string;
    campaignId: string;
    amount: number;
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
};
