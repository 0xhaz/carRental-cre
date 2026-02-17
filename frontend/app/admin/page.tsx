"use client";

import { useState, useEffect } from "react";
import { Heading, Paragraph, Card, CardContent, Badge } from "@/components/ui";
import { kycApi, vehicleApi } from "@/lib/api";
import { ExplorerLink } from "@/components/web3";
import { useCREActivityFeed } from "@/hooks/useCRE";
import type { CREEventType } from "@/types/cre";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pendingKYC: 0,
    pendingRegistrations: 0,
    totalUsers: 0,
    totalVehicles: 0,
    totalBookings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { feed, counts } = useCREActivityFeed();

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

      // Load pending token registrations
      const regResponse = await vehicleApi.getVehiclesPendingRegistration();
      if (regResponse.success) {
        setStats((prev) => ({
          ...prev,
          pendingRegistrations: regResponse.data.length,
        }));
      }
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

        <Link href="/admin/milestones">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Pending Token Registrations</p>
                {stats.pendingRegistrations > 0 && (
                  <Badge variant="warning">{stats.pendingRegistrations}</Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingRegistrations}</p>
              <p className="text-xs text-gray-600 mt-2">Needs on-chain setup</p>
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

        <Link href="/admin/bookings">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Bookings</p>
              </div>
              <p className="text-3xl font-bold text-teal-600">Manage</p>
              <p className="text-xs text-gray-600 mt-2">Approve & monitor</p>
            </CardContent>
          </Card>
        </Link>
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
            <Link
              href="/admin/milestones"
              className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Token Registrations</p>
                  <p className="text-xs text-gray-600">Register tokens on-chain</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/milestones"
              className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Manage Milestones</p>
                  <p className="text-xs text-gray-600">Complete & release funds</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/revenue"
              className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Manage Revenue</p>
                  <p className="text-xs text-gray-600">Add & distribute</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/bookings"
              className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Manage Bookings</p>
                  <p className="text-xs text-gray-600">Approve & monitor</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/compliance"
              className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Compliance</p>
                  <p className="text-xs text-gray-600">Renter & vehicle checks</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/vehicle-monitoring"
              className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Vehicle Monitoring</p>
                  <p className="text-xs text-gray-600">CRE telematics & health</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/onboarding"
              className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Onboarding</p>
                  <p className="text-xs text-gray-600">CRE auto-approvals</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/campaigns"
              className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Campaign Monitor</p>
                  <p className="text-xs text-gray-600">CRE failures & refunds</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/cre-activity"
              className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">CRE Activity</p>
                  <p className="text-xs text-gray-600">Real-time event feed</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/disputes"
              className="p-4 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Resolve Disputes</p>
                  <p className="text-xs text-gray-600">Emergency resolve</p>
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
            <div className="flex items-center justify-between mb-3">
              <Heading as="h3" className="text-purple-900">
                CRE Activity
              </Heading>
              <Link href="/admin/cre-activity" className="text-xs text-purple-600 hover:underline">
                View all →
              </Link>
            </div>
            {feed.length === 0 ? (
              <div className="space-y-2 text-sm text-purple-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p>Listening for CRE events...</p>
                </div>
                <p className="text-xs text-purple-600">
                  {stats.pendingKYC} pending KYC submissions
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {feed.slice(0, 4).map((item, idx) => {
                  const colors: Record<CREEventType, string> = {
                    payment: "bg-green-500",
                    compliance: "bg-indigo-500",
                    vehicle: "bg-cyan-500",
                    onboarding: "bg-emerald-500",
                    campaign: "bg-rose-500",
                  };
                  return (
                    <div key={`${item.transactionHash}-${idx}`} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colors[item.type]} shrink-0`} />
                      <span className="text-xs text-purple-900 font-medium truncate">
                        {item.label}
                      </span>
                      <span className="text-xs text-purple-600 truncate">
                        {item.description}
                      </span>
                    </div>
                  );
                })}
                {feed.length > 4 && (
                  <p className="text-xs text-purple-600">
                    +{feed.length - 4} more events this session
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
