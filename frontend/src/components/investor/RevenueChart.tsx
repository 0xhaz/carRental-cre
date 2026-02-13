"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface RevenueData {
  month: string;
  revenue: number;
  earnings?: number;
  bookings?: number;
}

export interface RevenueChartProps {
  data: RevenueData[];
  title?: string;
  description?: string;
  showEarnings?: boolean;
  showBookings?: boolean;
  className?: string;
}

export function RevenueChart({
  data,
  title = "Revenue Over Time",
  description = "Monthly revenue and earnings",
  showEarnings = true,
  showBookings = false,
  className,
}: RevenueChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              stroke="#888888"
              fontSize={12}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "12px",
              }}
              formatter={(value: number | undefined, name: string) => {
                if (value === undefined) return "";
                // Format bookings as a number, everything else as currency
                if (name === "Bookings") {
                  return value.toString();
                }
                return formatCurrency(value);
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
            />
            {showEarnings && (
              <Line
                type="monotone"
                dataKey="earnings"
                name="Earnings"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {showBookings && (
              <Line
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Simple stats cards to accompany the chart
export function RevenueStats({ data }: { data: RevenueData[] }) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = totalRevenue / data.length;
  const lastMonthRevenue = data[data.length - 1]?.revenue || 0;
  const previousMonthRevenue = data[data.length - 2]?.revenue || 0;
  const growth = previousMonthRevenue
    ? ((lastMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : 0;

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      change: null,
    },
    {
      label: "Average Monthly",
      value: formatCurrency(avgRevenue),
      change: null,
    },
    {
      label: "Last Month",
      value: formatCurrency(lastMonthRevenue),
      change: growth,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            {stat.change !== null && (
              <p className={`text-sm mt-1 ${stat.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stat.change >= 0 ? "+" : ""}
                {stat.change.toFixed(1)}% from previous month
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
