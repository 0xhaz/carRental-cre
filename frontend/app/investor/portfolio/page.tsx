"use client";

import { useState, useEffect } from "react";
import { PortfolioCard, PortfolioCardSkeleton } from "@/components/investor";
import { TokenPortfolio } from "@/components/investor/TokenPortfolio";
import { TransactionHistory } from "@/components/investor/TransactionHistory";
import { RevenueClaimCard } from "@/components/investor/RevenueClaimCard";
import { VerificationStatusBanner } from "@/components/shared/VerificationStatusBanner";
import { Heading, Paragraph, Badge, Button, Separator } from "@/components/ui";
import { Investment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useAccount } from "wagmi";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import { investmentApi } from "@/lib/api";
import { toast } from "react-hot-toast";

export default function InvestorPortfolio() {
  const { isConnected } = useAccount();
  const compliance = useComplianceStatus();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [roi, setRoi] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadPortfolio = async () => {
    setIsLoading(true);
    try {
      const response = await investmentApi.getPortfolio();

      if (response.success) {
        setInvestments(response.data.investments || []);
        setTotalInvested(response.data.totalInvested || 0);
        setTotalRevenue(response.data.totalRevenue || 0);
        setRoi(parseFloat(response.data.roi as any) || 0);
      }
    } catch (error: any) {
      console.error("Failed to load portfolio:", error);
      toast.error(error.response?.data?.message || "Failed to load portfolio");
      setInvestments([]);
      setTotalInvested(0);
      setTotalRevenue(0);
      setRoi(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  // Calculate portfolio stats
  // Current value is investment amount plus appreciation (estimated: 10% increase)
  const totalValue = investments.reduce((sum, inv) => sum + inv.amount * 1.1, 0);
  const profitLoss = totalValue - totalInvested + totalRevenue;
  const profitLossPercentage = totalInvested ? (profitLoss / totalInvested) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          My Portfolio
        </Heading>
        <Paragraph className="text-lg">
          Track your investments and earnings
        </Paragraph>
      </div>

      {/* Verification Status Banner */}
      <VerificationStatusBanner roleType="investor" className="mb-8" />

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-borderColor p-6">
          <p className="text-sm text-gray-600 mb-2">Total Invested</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalInvested)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-borderColor p-6">
          <p className="text-sm text-gray-600 mb-2">Current Value</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-borderColor p-6">
          <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className={`rounded-lg border border-borderColor p-6 ${profitLoss >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <p className="text-sm text-gray-600 mb-2">Total Return</p>
          <p className={`text-2xl font-bold ${profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
            {profitLoss >= 0 ? "+" : ""}
            {formatCurrency(profitLoss)}
          </p>
          <p className={`text-xs mt-1 ${profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
            {profitLoss >= 0 ? "+" : ""}
            {profitLossPercentage.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Investments List */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Heading as="h2">My Investments</Heading>
          <Badge variant="primary">{investments.filter(i => i.status === "active").length} Active</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <PortfolioCardSkeleton key={i} />
            ))}
          </div>
        ) : investments.length > 0 ? (
          <div className="space-y-4">
            {investments.map((investment) => (
              <PortfolioCard
                key={investment._id}
                investment={investment}
                vehicle={typeof investment.vehicle === "object" ? investment.vehicle : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Paragraph className="text-lg text-gray-600">
              You haven't made any investments yet.
            </Paragraph>
            <Paragraph className="mt-2 text-sm text-gray-500">
              Visit the marketplace to start investing.
            </Paragraph>
          </div>
        )}
      </div>

      {/* Blockchain Data Section */}
      {isConnected && (
        <>
          <Separator className="my-8" />

          {/* Token Portfolio */}
          <div className="mb-8">
            <Heading as="h2" className="mb-4">
              Token Holdings
            </Heading>
            <TokenPortfolio investments={investments} />
          </div>

          {/* Revenue Claiming */}
          {investments.length > 0 && (
            <>
              <Separator className="my-8" />
              <div className="mb-8">
                <Heading as="h2" className="mb-4">
                  Revenue Distribution
                </Heading>
                <p className="text-sm text-gray-600 mb-4">
                  Claim your share of rental revenue for each invested vehicle.
                </p>
                <div className="space-y-3">
                  {investments
                    .filter((inv) => {
                      const v = inv.vehicle as any;
                      return v && typeof v === "object" && v.tokenId;
                    })
                    .map((inv) => {
                      const v = inv.vehicle as any;
                      return (
                        <RevenueClaimCard
                          key={inv._id}
                          vehicleId={BigInt(v.tokenId)}
                          vehicleName={`${v.brand || "Vehicle"} ${v.model || ""}`}
                        />
                      );
                    })}
                  {investments.filter((inv) => {
                    const v = inv.vehicle as any;
                    return v && typeof v === "object" && v.tokenId;
                  }).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No tokenized vehicles in your portfolio yet.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator className="my-8" />

          {/* Transaction History */}
          <div className="mb-8">
            <Heading as="h2" className="mb-4">
              Transaction History
            </Heading>
            <TransactionHistory investments={investments} limit={5} />
          </div>
        </>
      )}

      {/* Wallet Connection Prompt */}
      {!isConnected && investments.length > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🔗</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Connect Your Wallet for Blockchain Features
              </h3>
              <p className="text-sm text-gray-600">
                View your token balances, track on-chain transactions, and claim revenue
                distributions by connecting your wallet.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
