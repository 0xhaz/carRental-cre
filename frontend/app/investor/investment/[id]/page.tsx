"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Heading,
  Paragraph,
  Button,
  Card,
  CardContent,
  Badge,
  Progress,
} from "@/src/components/ui";
import { generateMockInvestments, generateMockVehicles } from "@/src/lib/mockData";
import { Investment, Vehicle } from "@/src/types";
import { formatCurrency } from "@/src/lib/utils";
import Image from "next/image";
import { toast } from "react-hot-toast";

export default function InvestmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const investmentId = params.id as string;

  const [investment, setInvestment] = useState<Investment | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInvestment = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find investment from mock data
      const mockInvestments = generateMockInvestments(10);
      const foundInvestment = mockInvestments.find((inv) => inv._id === investmentId);

      if (foundInvestment) {
        setInvestment(foundInvestment);

        // Find associated vehicle
        const mockVehicles = generateMockVehicles(20);
        const foundVehicle = mockVehicles.find((v) => v._id === foundInvestment.vehicle);
        if (foundVehicle) {
          setVehicle(foundVehicle);
        }
      }

      setIsLoading(false);
    };

    loadInvestment();
  }, [investmentId]);

  const handleWithdrawRevenue = () => {
    toast.success("Revenue withdrawal initiated!");
  };

  const handleTransferTokens = () => {
    toast("Token transfer feature coming soon!", {
      icon: "🔄",
      duration: 3000,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-96 bg-gray-200 rounded-lg" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Heading as="h2" className="mb-4">
            Investment Not Found
          </Heading>
          <Paragraph className="mb-6">
            This investment doesn't exist or has been removed.
          </Paragraph>
          <Button onClick={() => router.push("/investor/portfolio")}>
            Back to Portfolio
          </Button>
        </Card>
      </div>
    );
  }

  // Calculate metrics
  const totalValue = investment.amount * 1.1; // Mock: 10% appreciation
  const profitLoss = totalValue - investment.amount + investment.totalRevenueEarned;
  const profitLossPercentage = (profitLoss / investment.amount) * 100;
  const isProfit = profitLoss >= 0;

  // Mock revenue history (last 6 months)
  const revenueHistory = Array.from({ length: 6 }, (_, i) => ({
    month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    amount: Math.floor(Math.random() * 500) + 100,
  }));

  // Mock transaction history
  const transactions = [
    {
      id: '1',
      type: 'Investment',
      date: new Date(investment.investmentDate),
      amount: investment.amount,
      status: 'Completed',
    },
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `${i + 2}`,
      type: 'Revenue Distribution',
      date: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000),
      amount: Math.floor(Math.random() * 500) + 100,
      status: 'Completed',
    })),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/investor/portfolio")}
        className="mb-6"
      >
        ← Back to Portfolio
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle & Investment Overview */}
          <Card className="overflow-hidden">
            {vehicle && (
              <div className="relative h-96">
                <Image
                  src={vehicle.image || "/assets/car_image1.png"}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                  width={800}
                  height={400}
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge variant={investment.status === "active" ? "success" : "default"} className="shadow-lg">
                    {investment.status}
                  </Badge>
                </div>
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Heading as="h1" className="mb-2">
                    {vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : "Investment"}
                  </Heading>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    {vehicle && (
                      <>
                        <span>📍 {vehicle.location}</span>
                        <span>🚗 {vehicle.category}</span>
                        <span>⛽ {vehicle.fuelType}</span>
                      </>
                    )}
                    <span>💼 Investment ID: {investment._id.slice(-8)}</span>
                  </div>
                </div>
              </div>
              {vehicle && <Paragraph className="text-lg">{vehicle.description}</Paragraph>}
            </CardContent>
          </Card>

          {/* Investment Performance */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Investment Performance
              </Heading>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Initial Investment</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(investment.amount)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    on {new Date(investment.investmentDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Current Value</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(totalValue)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Asset appreciation
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Revenue Earned</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(investment.totalRevenueEarned)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    From rental operations
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
                  <p className="text-sm text-gray-600 mb-1">Total Return</p>
                  <p className={`text-2xl font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                    {isProfit ? "+" : ""}{formatCurrency(profitLoss)}
                  </p>
                  <p className={`text-xs mt-1 ${isProfit ? "text-green-600" : "text-red-600"}`}>
                    {isProfit ? "+" : ""}{profitLossPercentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue History */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Revenue History
              </Heading>

              <div className="space-y-3">
                {revenueHistory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.month}</p>
                      <p className="text-sm text-gray-600">Monthly distribution</p>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      +{formatCurrency(item.amount)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Revenue is distributed monthly based on your token ownership percentage.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Transaction History
              </Heading>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium">{tx.type}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {tx.date.toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {tx.type === 'Investment' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="success">{tx.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Investment Details */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Investment Details
              </Heading>

              {/* Token Holdings */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Asset Tokens</span>
                  <span className="font-semibold">
                    {(investment.assetTokens || 0).toLocaleString()} RST
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investment Date</span>
                  <span className="font-semibold">
                    {new Date(investment.investmentDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <Badge variant={investment.status === "active" ? "success" : "default"}>
                    {investment.status}
                  </Badge>
                </div>
                {vehicle?.fundraising && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected ROI</span>
                    <span className="font-semibold text-green-600">
                      {vehicle.fundraising.expectedROI}%
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleWithdrawRevenue}
                >
                  💰 Withdraw Revenue
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleTransferTokens}
                >
                  🔄 Transfer Tokens
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => vehicle && router.push(`/investor/vehicle/${vehicle._id}`)}
                  disabled={!vehicle}
                >
                  📊 View Campaign
                </Button>
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs text-green-800">
                  <strong>Your Investment:</strong> You own {investment.assetTokens?.toLocaleString()} tokens,
                  representing your share in this vehicle's revenue stream.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
