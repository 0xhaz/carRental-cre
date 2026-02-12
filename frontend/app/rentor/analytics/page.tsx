"use client";

import { useState, useEffect } from "react";
import { RevenueChart, RevenueStats } from "@/src/components/investor";
import { VehicleStatsCard } from "@/src/components/rentor";
import { Heading, Paragraph, Card, CardContent, Badge, Button, Select } from "@/src/components/ui";
import { generateMockRevenueData, generateMockVehicles } from "@/src/lib/mockData";
import { formatCurrency } from "@/src/lib/utils";
import { Vehicle } from "@/src/types";

export default function RentorAnalytics() {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "quarter" | "year">("month");

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockRevenue = generateMockRevenueData(12); // Last 12 months
      const mockVehicles = generateMockVehicles(8);

      setRevenueData(mockRevenue);
      setVehicles(mockVehicles);
      setIsLoading(false);
    };

    loadAnalytics();
  }, []);

  // Calculate aggregate stats
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalBookings = revenueData.reduce((sum, item) => sum + item.bookings, 0);
  const averageRevenuePerMonth = totalRevenue / revenueData.length || 0;
  const activeVehicles = vehicles.filter((v) => v.isAvailable).length;
  const utilizationRate = ((totalBookings / (vehicles.length * 30)) * 100).toFixed(1);

  // Vehicle-specific stats
  const topPerformingVehicle = vehicles.reduce((top, vehicle) => {
    const vehicleRevenue = Math.random() * 10000; // Mock revenue per vehicle
    const topRevenue = Math.random() * 10000;
    return vehicleRevenue > topRevenue ? vehicle : top;
  }, vehicles[0]);

  const vehicleStats = {
    totalRevenue: totalRevenue,
    totalBookings: totalBookings,
    activeBookings: Math.floor(Math.random() * 10) + 3,
    completedBookings: totalBookings - Math.floor(Math.random() * 10) - 3,
    utilizationRate: parseFloat(utilizationRate),
    averageRating: 4.7,
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
            <p className="text-xs text-green-600 mt-2">+12.5% vs last period</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
            <p className="text-3xl font-bold text-green-700">{totalBookings}</p>
            <p className="text-xs text-green-600 mt-2">+8.3% vs last period</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Avg Revenue/Month</p>
            <p className="text-3xl font-bold text-purple-700">
              {formatCurrency(averageRevenuePerMonth)}
            </p>
            <p className="text-xs text-gray-600 mt-2">Over {revenueData.length} months</p>
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
            period="Last 12 Months"
          />
        </div>
      )}

      {/* Top Performing Vehicle */}
      {!isLoading && topPerformingVehicle && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Heading as="h3" className="mb-1">
                  Top Performing Vehicle
                </Heading>
                <Paragraph className="text-sm text-gray-600">
                  Highest revenue generator in your fleet
                </Paragraph>
              </div>
              <Badge variant="success">Best Performer</Badge>
            </div>

            <div className="flex gap-6 items-start">
              <img
                src={topPerformingVehicle.image}
                alt={`${topPerformingVehicle.brand} ${topPerformingVehicle.model}`}
                className="w-48 h-32 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h4 className="text-xl font-semibold mb-2">
                  {topPerformingVehicle.brand} {topPerformingVehicle.model} ({topPerformingVehicle.year})
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Revenue Generated</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(8750)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Bookings</p>
                    <p className="text-lg font-bold text-blue-600">32</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Rating</p>
                    <p className="text-lg font-bold text-orange-600">4.9/5.0</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Performance Breakdown */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">
            Individual Vehicle Performance
          </Heading>
          <div className="space-y-4">
            {vehicles.slice(0, 5).map((vehicle, index) => {
              const vehicleRevenue = Math.floor(Math.random() * 5000) + 3000;
              const vehicleBookings = Math.floor(Math.random() * 20) + 10;
              const utilizationPercent = Math.floor(Math.random() * 40) + 60;

              return (
                <div
                  key={vehicle._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={vehicle.image}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h5 className="font-semibold">
                        {vehicle.brand} {vehicle.model}
                      </h5>
                      <p className="text-sm text-gray-600">{vehicle.year}</p>
                    </div>
                  </div>

                  <div className="flex gap-8 items-center">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(vehicleRevenue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Bookings</p>
                      <p className="font-semibold text-blue-600">{vehicleBookings}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Utilization</p>
                      <p className="font-semibold text-orange-600">
                        {utilizationPercent}%
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Heading as="h3" className="mb-4">
              Revenue by Category
            </Heading>
            <div className="space-y-3">
              {[
                { category: "Sedan", revenue: 12500, percentage: 35, color: "bg-blue-500" },
                { category: "SUV", revenue: 18750, percentage: 45, color: "bg-green-500" },
                { category: "Luxury", revenue: 8750, percentage: 20, color: "bg-purple-500" },
              ].map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{item.category}</span>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(item.revenue)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Heading as="h3" className="mb-4">
              Booking Status Distribution
            </Heading>
            <div className="space-y-3">
              {[
                { status: "Completed", count: 142, percentage: 65, color: "bg-green-500" },
                { status: "Active", count: 38, percentage: 20, color: "bg-blue-500" },
                { status: "Pending", count: 18, percentage: 10, color: "bg-orange-500" },
                { status: "Cancelled", count: 12, percentage: 5, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.status}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{item.status}</span>
                    <span className="text-sm text-gray-600">
                      {item.count} bookings ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
