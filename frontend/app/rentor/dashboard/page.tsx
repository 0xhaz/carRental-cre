"use client";

import { useState, useEffect } from "react";
import { VehicleStatsCard, QuickStats } from "@/components/rentor";
import { RevenueChart } from "@/components/investor";
import { VerificationStatusBanner } from "@/components/shared/VerificationStatusBanner";
import { Heading, Paragraph, Card, CardContent, Button } from "@/components/ui";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import { rentorApi, type RentorDashboardData } from "@/lib/api";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function RentorDashboard() {
  const compliance = useComplianceStatus();
  const [dashboardData, setDashboardData] = useState<RentorDashboardData | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const response = await rentorApi.getDashboard();

        if (response.success) {
          setDashboardData(response.dashboardData);

          // Only show revenue chart when there's actual data from backend
          // Revenue data will be populated from actual bookings in the future
          setRevenueData([]);
        }
      } catch (error: any) {
        console.error("Failed to load dashboard:", error);
        toast.error(error.response?.data?.message || "Failed to load dashboard data");

        // Set empty data on error
        setDashboardData({
          totalCars: 0,
          totalBookings: 0,
          pendingBookings: 0,
          completedBookings: 0,
          recentBookings: [],
          monthlyRevenue: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // Calculate stats from real data
  const stats = {
    totalRevenue: dashboardData?.monthlyRevenue || 0,
    totalBookings: dashboardData?.totalBookings || 0,
    activeBookings: dashboardData?.pendingBookings || 0,
    utilizationRate: dashboardData?.totalCars
      ? parseFloat(((dashboardData.totalBookings / (dashboardData.totalCars * 30)) * 100).toFixed(1))
      : 0,
  };

  const vehicleStats = {
    totalRevenue: dashboardData?.monthlyRevenue || 0,
    totalBookings: dashboardData?.totalBookings || 0,
    activeBookings: dashboardData?.pendingBookings || 0,
    completedBookings: dashboardData?.completedBookings || 0,
    utilizationRate: dashboardData?.totalCars
      ? parseFloat(((dashboardData.totalBookings / (dashboardData.totalCars * 30)) * 100).toFixed(1))
      : 0,
    averageRating: 0, // Will be calculated from real reviews when available
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Rentor Dashboard
        </Heading>
        <Paragraph className="text-lg">
          Manage your fleet, track revenue, and monitor performance
        </Paragraph>
      </div>

      {/* Verification Status Banner */}
      <VerificationStatusBanner roleType="rentor" className="mb-8" />

      {/* Quick Stats */}
      <QuickStats stats={stats} />

      {/* Vehicle Performance */}
      {!isLoading && (
        <div className="mt-8">
          <VehicleStatsCard stats={vehicleStats} period="Last 30 Days" />
        </div>
      )}

      {/* Revenue Chart */}
      {!isLoading && revenueData.length > 0 && (
        <div className="mt-8">
          <RevenueChart
            data={revenueData}
            title="Fleet Revenue"
            description="Monthly revenue from all vehicles"
            showEarnings={false}
            showBookings={true}
          />
        </div>
      )}

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">
            Quick Actions
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/rentor/vehicles">
              <Button variant="default" className="w-full">
                Manage Vehicles
              </Button>
            </Link>
            <Link href="/rentor/bookings">
              <Button variant="outline" className="w-full">
                View Bookings
              </Button>
            </Link>
            <Link href="/rentor/fundraising">
              <Button variant="outline" className="w-full">
                Start Fundraising
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
