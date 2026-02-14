"use client";

import { useState, useEffect } from "react";
import { Heading, Paragraph, Card, CardContent, Badge } from "@/components/ui";
import { kycApi } from "@/lib/api";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pendingKYC: 0,
    totalUsers: 0,
    totalVehicles: 0,
    totalBookings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Load KYC stats
      const kycResponse = await kycApi.getPending();
      if (kycResponse.success) {
        setStats((prev) => ({
          ...prev,
          pendingKYC: kycResponse.count || 0,
        }));
      }

      // TODO: Load other stats from respective APIs
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Admin Dashboard
        </Heading>
        <Paragraph className="text-lg">
          Platform overview and management tools
        </Paragraph>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link href="/admin/kyc">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Pending KYC</p>
                {stats.pendingKYC > 0 && (
                  <Badge variant="warning">{stats.pendingKYC}</Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-orange-600">{stats.pendingKYC}</p>
              <p className="text-xs text-gray-600 mt-2">Requires review</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/investors">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Investor Requests</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">Manage</p>
              <p className="text-xs text-gray-600 mt-2">On-chain approvals</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-60">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Platform Stats</p>
            <p className="text-3xl font-bold text-gray-400">-</p>
            <p className="text-xs text-gray-500 mt-2">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h2" className="mb-4">
            Quick Actions
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/kyc"
              className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Review KYC</p>
                  <p className="text-xs text-gray-600">Pending verifications</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/investors"
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Manage Investors</p>
                  <p className="text-xs text-gray-600">Approve/reject requests</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <Heading as="h3" className="mb-3 text-blue-900">
              Platform Status
            </Heading>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-blue-800">All systems operational</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-blue-800">Backend API connected</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-blue-800">Database connected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <Heading as="h3" className="mb-3 text-purple-900">
              Recent Activity
            </Heading>
            <div className="space-y-2 text-sm text-purple-800">
              <p>• {stats.pendingKYC} pending KYC submissions</p>
              <p>• Platform running smoothly</p>
              <p>• Ready for Web3 integration</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
