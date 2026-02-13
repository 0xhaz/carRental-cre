"use client";

import { useState, useEffect } from "react";
import { RevenueChart, RevenueStats, TransferTokensModal } from "@/components/investor";
import { Heading, Paragraph, Card, CardContent, Button } from "@/components/ui";
import { generateMockRevenueData } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function InvestorDashboard() {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    // Simulate loading dashboard data
    const loadDashboard = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockData = generateMockRevenueData(6);
      // Add earnings field
      const dataWithEarnings = mockData.map((item) => ({
        ...item,
        earnings: item.revenue * 0.12, // 12% ROI
      }));

      setRevenueData(dataWithEarnings);
      setIsLoading(false);
    };

    loadDashboard();
  }, []);

  // Mock quick stats
  const stats = {
    activeInvestments: 5,
    totalInvested: 25000,
    totalValue: 27500,
    monthlyEarnings: 250,
  };

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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Active Investments</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats.activeInvestments}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Total Invested</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(stats.totalInvested)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Current Value</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(stats.totalValue)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              +{((stats.totalValue - stats.totalInvested) / stats.totalInvested * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Monthly Earnings</p>
            <p className="text-3xl font-bold text-purple-600">
              {formatCurrency(stats.monthlyEarnings)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {!isLoading && revenueData.length > 0 && (
        <>
          <div className="mb-8">
            <RevenueStats data={revenueData} />
          </div>

          <RevenueChart
            data={revenueData}
            title="Revenue & Earnings Trend"
            description="Monthly performance over the last 6 months"
            showEarnings={true}
            className="mb-8"
          />
        </>
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
