"use client";

import { useState, useEffect } from "react";
import { VehicleStatsCard, QuickStats } from "@/src/components/rentor";
import { RevenueChart } from "@/src/components/investor";
import { Heading, Paragraph, Card, CardContent, Button } from "@/src/components/ui";
import { generateMockRevenueData } from "@/src/lib/mockData";
import Link from "next/link";

export default function RentorDashboard() {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockData = generateMockRevenueData(6);
      setRevenueData(mockData);
      setIsLoading(false);
    };

    loadDashboard();
  }, []);

  // Mock stats
  const stats = {
    totalRevenue: 15000,
    totalBookings: 42,
    activeBookings: 5,
    utilizationRate: 78.5,
  };

  const vehicleStats = {
    totalRevenue: 15000,
    totalBookings: 42,
    activeBookings: 5,
    completedBookings: 37,
    utilizationRate: 78.5,
    averageRating: 4.8,
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
