"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { InvestmentModal } from "@/src/components/investor";
import {
  Heading,
  Paragraph,
  Button,
  Card,
  CardContent,
  Badge,
  Progress,
} from "@/src/components/ui";
import { generateMockVehicles } from "@/src/lib/mockData";
import { Vehicle } from "@/src/types";
import { formatCurrency } from "@/src/lib/utils";
import Image from "next/image";
import { toast } from "react-hot-toast";

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);

  useEffect(() => {
    const loadVehicle = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find vehicle from mock data
      const mockVehicles = generateMockVehicles(20);
      const foundVehicle = mockVehicles.find((v) => v._id === vehicleId);

      if (foundVehicle && foundVehicle.fundraising?.active) {
        setVehicle(foundVehicle);
      }

      setIsLoading(false);
    };

    loadVehicle();
  }, [vehicleId]);

  const handleInvestmentSuccess = (amount: number) => {
    toast.success(`Successfully invested ${formatCurrency(amount)}!`);
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

  if (!vehicle || !vehicle.fundraising) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Heading as="h2" className="mb-4">
            Vehicle Not Found
          </Heading>
          <Paragraph className="mb-6">
            This investment opportunity is no longer available or doesn't exist.
          </Paragraph>
          <Button onClick={() => router.push("/investor/marketplace")}>
            Back to Marketplace
          </Button>
        </Card>
      </div>
    );
  }

  const { fundraising } = vehicle;
  const fundingPercentage =
    (fundraising.currentAmount / fundraising.targetAmount) * 100;
  const remainingAmount = fundraising.targetAmount - fundraising.currentAmount;
  const daysLeft = Math.floor(Math.random() * 60) + 10;

  // Mock investment pitch
  const investmentPitch = {
    overview: `Invest in this ${vehicle.year} ${vehicle.brand} ${vehicle.model}, a premium ${vehicle.category} available for rental in ${vehicle.location}. This vehicle represents a unique opportunity to earn passive income through the sharing economy.`,
    whyInvest: [
      `High-demand ${vehicle.category} in ${vehicle.location}'s competitive rental market`,
      `Premium ${vehicle.brand} brand with strong resale value`,
      `Competitive daily rate of ${formatCurrency(vehicle.pricePerDay)}`,
      `Professional maintenance and insurance coverage included`,
      `Transparent blockchain-based revenue distribution`,
    ],
    financials: {
      estimatedAnnualRevenue: vehicle.pricePerDay * 200, // Assume 200 rental days/year
      operatingCosts: vehicle.pricePerDay * 200 * 0.3, // 30% costs
      netIncome: vehicle.pricePerDay * 200 * 0.7,
      returnOnInvestment: fundraising.expectedROI,
    },
    useOfFunds: [
      { item: "Vehicle Acquisition", percentage: 70, amount: fundraising.targetAmount * 0.7 },
      { item: "Insurance & Registration", percentage: 10, amount: fundraising.targetAmount * 0.1 },
      { item: "Initial Maintenance", percentage: 10, amount: fundraising.targetAmount * 0.1 },
      { item: "Platform Fees", percentage: 5, amount: fundraising.targetAmount * 0.05 },
      { item: "Reserve Fund", percentage: 5, amount: fundraising.targetAmount * 0.05 },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/investor/marketplace")}
        className="mb-6"
      >
        ← Back to Marketplace
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Image & Title */}
          <Card className="overflow-hidden">
            <div className="relative h-96">
              <Image
                src={vehicle.image || "/assets/car_image1.png"}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-full h-full object-cover"
                width={800}
                height={400}
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge variant="default" className="shadow-lg">
                  {fundingPercentage.toFixed(0)}% Funded
                </Badge>
                <Badge variant="success" className="shadow-lg">
                  {fundraising.expectedROI}% ROI
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <Heading as="h1" className="mb-2">
                {vehicle.brand} {vehicle.model} ({vehicle.year})
              </Heading>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                <span>📍 {vehicle.location}</span>
                <span>🚗 {vehicle.category}</span>
                <span>⛽ {vehicle.fuelType}</span>
                <span>👥 {vehicle.seatingCapacity} seats</span>
                <span>⚙️ {vehicle.transmission}</span>
              </div>
              <Paragraph className="text-lg">{vehicle.description}</Paragraph>
            </CardContent>
          </Card>

          {/* Investment Pitch */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Investment Opportunity
              </Heading>
              <Paragraph className="mb-6">{investmentPitch.overview}</Paragraph>

              <Heading as="h3" className="mb-3">
                Why Invest?
              </Heading>
              <ul className="space-y-2 mb-6">
                {investmentPitch.whyInvest.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Financial Projections */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Financial Projections
              </Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Estimated Annual Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(investmentPitch.financials.estimatedAnnualRevenue)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Operating Costs (30%)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(investmentPitch.financials.operatingCosts)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Net Annual Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(investmentPitch.financials.netIncome)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Expected ROI</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {investmentPitch.financials.returnOnInvestment}%
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Heading as="h3" className="mb-3">
                  Use of Funds
                </Heading>
                <div className="space-y-3">
                  {investmentPitch.useOfFunds.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.item}</span>
                        <span className="font-semibold">
                          {item.percentage}% · {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <Progress value={item.percentage} variant="default" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Investment Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Investment Details
              </Heading>

              {/* Funding Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold">Funding Progress</span>
                  <span>{fundingPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={fundingPercentage} variant="default" className="mb-2" />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{formatCurrency(fundraising.currentAmount)} raised</span>
                  <span>Goal: {formatCurrency(fundraising.targetAmount)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining</span>
                  <span className="font-semibold">{formatCurrency(remainingAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investors</span>
                  <span className="font-semibold">
                    {fundraising.investors?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min. Investment</span>
                  <span className="font-semibold">{formatCurrency(100)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Left</span>
                  <span className="font-semibold">{daysLeft} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Rate</span>
                  <span className="font-semibold">
                    {formatCurrency(vehicle.pricePerDay)}/day
                  </span>
                </div>
              </div>

              {/* Investment Button */}
              <Button
                className="w-full mb-4"
                size="lg"
                onClick={() => setShowInvestmentModal(true)}
              >
                Invest Now
              </Button>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  <strong>Secure Investment:</strong> All investments are backed by
                  blockchain technology with transparent revenue distribution.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Investment Modal */}
      {showInvestmentModal && (
        <InvestmentModal
          vehicle={vehicle}
          onClose={() => setShowInvestmentModal(false)}
          onSuccess={handleInvestmentSuccess}
        />
      )}
    </div>
  );
}
