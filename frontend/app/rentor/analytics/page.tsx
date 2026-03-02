"use client";

import { useState, useEffect, useCallback } from "react";
import { RevenueChart } from "@/components/investor";
import { VehicleStatsCard } from "@/components/rentor";
import { Heading, Paragraph, Card, CardContent, Select } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Vehicle } from "@/types";
import { rentorApi, vehicleApi } from "@/lib/api";
import { RevenueHistoryEntry } from "@/lib/api/rentorApi";
import { toast } from "react-hot-toast";

const periodToMonths: Record<string, number> = {
  week: 2,
  month: 3,
  quarter: 6,
  year: 12,
};

export default function RentorAnalytics() {
  const [revenueData, setRevenueData] = useState<RevenueHistoryEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "quarter" | "year">("month");

  const loadRevenueHistory = useCallback(async (period: string) => {
    try {
      const months = periodToMonths[period] || 6;
      const response = await rentorApi.getRevenueHistory(months);
      if (response.success && response.data) {
        setRevenueData(response.data);
      }
    } catch (error: any) {
      console.error("Failed to load revenue history:", error);
    }
  }, []);

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        // Load dashboard data, vehicles, and revenue history in parallel
        const [dashResponse, vehiclesResponse] = await Promise.all([
          rentorApi.getDashboard(),
          vehicleApi.getRentorVehicles(),
        ]);

        if (dashResponse.success) {
          setDashboardData(dashResponse.dashboardData);
        }

        if (vehiclesResponse.success) {
          setVehicles(vehiclesResponse.data || []);
        }

        // Load revenue history
        await loadRevenueHistory(selectedPeriod);
      } catch (error: any) {
        console.error("Failed to load analytics:", error);
        toast.error(error.response?.data?.message || "Failed to load analytics");

        setDashboardData({
          totalCars: 0,
          totalBookings: 0,
          pendingBookings: 0,
          completedBookings: 0,
          monthlyRevenue: 0,
          totalRevenue: 0,
        });
        setVehicles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch revenue history when period changes
  useEffect(() => {
    if (!isLoading) {
      loadRevenueHistory(selectedPeriod);
    }
  }, [selectedPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate aggregate stats from real data
  const totalRevenue = dashboardData?.totalRevenue || dashboardData?.monthlyRevenue || 0;
  const totalBookings = dashboardData?.totalBookings || 0;
  const activeVehicles = vehicles.filter((v) => v.isAvailable).length;
  const utilizationRate = vehicles.length > 0
    ? ((totalBookings / (vehicles.length * 30)) * 100).toFixed(1)
    : "0.0";

  const vehicleStats = {
    totalRevenue: totalRevenue,
    totalBookings: totalBookings,
    activeBookings: dashboardData?.pendingBookings || 0,
    completedBookings: dashboardData?.completedBookings || 0,
    utilizationRate: parseFloat(utilizationRate),
    averageRating: 4.7, // TODO: Calculate from real reviews
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <Heading as="h1" className="mb-2">
              Fleet Analytics
            </Heading>
            <Paragraph className="text-lg">
              Comprehensive insights into your fleet performance
            </Paragraph>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Period:</span>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="w-32"
              options={[
                { value: "week", label: "Last Week" },
                { value: "month", label: "Last Month" },
                { value: "quarter", label: "Last Quarter" },
                { value: "year", label: "Last Year" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-blue-700">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs text-gray-600 mt-2">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
            <p className="text-3xl font-bold text-green-700">{totalBookings}</p>
            <p className="text-xs text-gray-600 mt-2">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Fleet Size</p>
            <p className="text-3xl font-bold text-purple-700">{vehicles.length}</p>
            <p className="text-xs text-gray-600 mt-2">{activeVehicles} active</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Fleet Utilization</p>
            <p className="text-3xl font-bold text-orange-700">{utilizationRate}%</p>
            <p className="text-xs text-orange-600 mt-2">{activeVehicles}/{vehicles.length} vehicles active</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {!isLoading && revenueData.length > 0 && (
        <div className="mb-8">
          <RevenueChart
            data={revenueData}
            title="Revenue Trends"
            description="Monthly revenue and booking trends over time"
            showEarnings={false}
            showBookings={true}
          />
        </div>
      )}

      {/* Fleet Performance Summary */}
      {!isLoading && (
        <div className="mb-8">
          <VehicleStatsCard
            stats={vehicleStats}
            period="Current Period"
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && vehicles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Paragraph className="text-lg text-gray-600 mb-2">
              No analytics data available
            </Paragraph>
            <Paragraph className="text-sm text-gray-500">
              Add vehicles to your fleet to start tracking analytics
            </Paragraph>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
