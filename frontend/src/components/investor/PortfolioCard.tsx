import { Investment, Vehicle } from "@/types";
import { Card, CardContent, Badge, Button, Progress } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export interface PortfolioCardProps {
  investment: Investment;
  vehicle?: Vehicle;
  onViewDetails?: (investmentId: string) => void;
  className?: string;
}

export function PortfolioCard({
  investment,
  vehicle,
  onViewDetails,
  className
}: PortfolioCardProps) {
  // Calculate current value (mock: 10% appreciation + revenue earned)
  const totalValue = investment.amount * 1.1;
  const profitLoss = totalValue - investment.amount + investment.totalRevenueEarned;
  const profitLossPercentage = (profitLoss / investment.amount) * 100;
  const isProfit = profitLoss >= 0;

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex flex-col md:flex-row">
        {/* Vehicle Image */}
        {vehicle && (
          <div className="relative w-full md:w-48 h-48 overflow-hidden">
            <Image
              src={vehicle.image || "/assets/car_image1.png"}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-full object-cover"
              width={192}
              height={192}
            />
            <div className="absolute top-2 left-2">
              <Badge
                variant={investment.status === "active" ? "success" : "default"}
              >
                {investment.status}
              </Badge>
            </div>
          </div>
        )}

        <CardContent className="flex-1 p-6">
          {/* Vehicle Info */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Investment"}
              </h3>
              <p className="text-sm text-gray-600">
                Investment ID: {investment._id.slice(-8)}
              </p>
            </div>
            <Link href={`/investor/investment/${investment._id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          </div>

          {/* Investment Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600">Initial Investment</p>
              <p className="text-base font-semibold text-gray-900">
                {formatCurrency(investment.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Current Value</p>
              <p className="text-base font-semibold text-gray-900">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Asset Tokens</p>
              <p className="text-base font-semibold text-blue-600">
                {(investment.assetTokens || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Revenue Earned</p>
              <p className="text-base font-semibold text-green-600">
                {formatCurrency(investment.totalRevenueEarned)}
              </p>
            </div>
          </div>

          {/* Profit/Loss Indicator */}
          <div className={`rounded-lg p-3 ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Return</span>
              <div className="text-right">
                <p className={`text-lg font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                  {isProfit ? "+" : ""}{formatCurrency(profitLoss)}
                </p>
                <p className={`text-xs ${isProfit ? "text-green-600" : "text-red-600"}`}>
                  {isProfit ? "+" : ""}{profitLossPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

// Skeleton loader
export function PortfolioCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-48 h-48 bg-gray-200 animate-pulse" />
        <CardContent className="flex-1 p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-16 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </div>
    </Card>
  );
}
