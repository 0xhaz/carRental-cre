"use client";

import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/src/components/ui";
import { formatCurrency } from "@/src/lib/utils";

export interface VehicleStats {
  totalRevenue: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  utilizationRate: number;
  averageRating?: number;
}

export interface VehicleStatsCardProps {
  stats: VehicleStats;
  period?: string;
  className?: string;
}

export function VehicleStatsCard({
  stats,
  period = "This Month",
  className,
}: VehicleStatsCardProps) {
  const statsData = [
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Total Bookings",
      value: stats.totalBookings.toString(),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Active Bookings",
      value: stats.activeBookings.toString(),
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      label: "Utilization Rate",
      value: `${stats.utilizationRate.toFixed(1)}%`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Vehicle Performance</CardTitle>
          <Badge variant="outline">{period}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 ${stat.bgColor}`}
            >
              <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {stats.averageRating && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Average Rating:</span>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-yellow-600">
                  {stats.averageRating.toFixed(1)}
                </span>
                <span className="text-yellow-500">★</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick stats overview
export function QuickStats({ stats }: { stats: Partial<VehicleStats> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.totalRevenue !== undefined && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </CardContent>
        </Card>
      )}
      {stats.totalBookings !== undefined && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Bookings</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.totalBookings}
            </p>
          </CardContent>
        </Card>
      )}
      {stats.activeBookings !== undefined && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Active</p>
            <p className="text-2xl font-bold text-orange-600">
              {stats.activeBookings}
            </p>
          </CardContent>
        </Card>
      )}
      {stats.utilizationRate !== undefined && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Utilization</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats.utilizationRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
