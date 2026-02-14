"use client";

import { useState, useEffect } from "react";
import { TransferTokensModal } from "@/components/investor";
import { InvestorOnboardingWizard } from "@/components/investor/InvestorOnboardingWizard";
import { Heading, Paragraph, Card, CardContent, Button, Badge } from "@/components/ui";
import { investmentApi } from "@/lib/api";
import { Investment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useAccount } from "wagmi";
import Link from "next/link";

export default function InvestorDashboard() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [roi, setRoi] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const { isConnected } = useAccount();

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const response = await investmentApi.getPortfolio();
        if (response.success) {
          setInvestments(response.data.investments || []);
          setTotalInvested(response.data.totalInvested || 0);
          setTotalRevenue(response.data.totalRevenue || 0);
          setRoi(parseFloat(response.data.roi as any) || 0);
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      }
      setIsLoading(false);
    };

    loadDashboard();
  }, []);

  const activeInvestments = investments.filter((inv) => inv.status === "active");

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Investor Dashboard
        </Heading>
        <Paragraph className="text-lg">
          Welcome back! Here's your investment overview
        </Paragraph>
      </div>

      {/* Investor Onboarding Status */}
      {isConnected && (
        <div className="mb-8">
          <InvestorOnboardingWizard compact />
        </div>
      )}

      {/* Quick Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Active Investments</p>
              <p className="text-3xl font-bold text-blue-600">
                {activeInvestments.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Total Invested</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalInvested)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(totalRevenue)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">ROI</p>
              <p className={`text-3xl font-bold ${roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                {roi >= 0 ? "+" : ""}{roi}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Investments */}
      {!isLoading && investments.length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <Heading as="h3">Recent Investments</Heading>
              <Link href="/investor/portfolio">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Vehicle</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Revenue</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.slice(0, 5).map((investment) => {
                    const vehicle = investment.vehicle as unknown as { brand?: string; model?: string } | string;
                    const isPopulated = typeof vehicle === "object" && vehicle !== null;
                    return (
                      <tr key={investment._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">
                          {isPopulated ? `${vehicle.brand} ${vehicle.model}` : "Vehicle"}
                        </td>
                        <td className="py-3 px-4">{formatCurrency(investment.amount)}</td>
                        <td className="py-3 px-4 text-green-600">
                          {formatCurrency(investment.totalRevenueEarned)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={investment.status === "active" ? "success" : "default"}>
                            {investment.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(investment.investedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && investments.length === 0 && (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <p className="text-lg text-gray-600 mb-2">No investments yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Browse the marketplace to find investment opportunities
            </p>
            <Link href="/investor/marketplace">
              <Button>Explore Marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">
            Quick Actions
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/investor/marketplace">
              <Button variant="default" className="w-full">
                Browse Investment Opportunities
              </Button>
            </Link>
            <Link href="/investor/portfolio">
              <Button variant="outline" className="w-full">
                View Full Portfolio
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowTransferModal(true)}
            >
              Transfer Tokens
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Tokens Modal */}
      {showTransferModal && (
        <TransferTokensModal onClose={() => setShowTransferModal(false)} />
      )}
    </div>
  );
}
