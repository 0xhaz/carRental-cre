"use client";

import { useState, useEffect } from "react";
import { PortfolioCard, PortfolioCardSkeleton } from "@/src/components/investor";
import { Heading, Paragraph, Badge } from "@/src/components/ui";
import { generateMockInvestments, generateMockVehicles } from "@/src/lib/mockData";
import { Investment, Vehicle } from "@/src/types";
import { formatCurrency } from "@/src/lib/utils";

export default function InvestorPortfolio() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading portfolio
    const loadPortfolio = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockInvestments = generateMockInvestments(6);
      const mockVehicles = generateMockVehicles(12);

      setInvestments(mockInvestments);
      setVehicles(mockVehicles);
      setIsLoading(false);
    };

    loadPortfolio();
  }, []);

  // Calculate portfolio stats
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  // Current value is investment amount plus appreciation (mock: 10% increase)
  const totalValue = investments.reduce(
    (sum, inv) => sum + inv.amount * 1.1,
    0
  );
  const totalRevenue = investments.reduce(
    (sum, inv) => sum + inv.totalRevenueEarned,
    0
  );
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
          <Badge variant="primary">{investments.length} Active</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <PortfolioCardSkeleton key={i} />
            ))}
          </div>
        ) : investments.length > 0 ? (
          <div className="space-y-4">
            {investments.map((investment) => {
              const vehicle = vehicles.find((v) => v._id === investment.vehicle);
              return (
                <PortfolioCard
                  key={investment._id}
                  investment={investment}
                  vehicle={vehicle}
                />
              );
            })}
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
    </div>
  );
}
