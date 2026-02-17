"use client";

import { useState } from "react";
import {
  Heading,
  Paragraph,
  Card,
  CardContent,
  Badge,
} from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useOnboardingReceiverConfig,
  useOnboardingReceiverTargets,
  useWatchOnboardingReports,
} from "@/hooks/useCRE";
import {
  OnboardingAction,
  ONBOARDING_ACTION_LABELS,
  type OnboardingReportEvent,
} from "@/types/cre";

/** Color mapping for onboarding actions */
const ACTION_COLORS: Record<OnboardingAction, string> = {
  [OnboardingAction.APPROVE_INVESTOR]: "bg-green-100 text-green-800",
  [OnboardingAction.REJECT_INVESTOR]: "bg-red-100 text-red-800",
  [OnboardingAction.APPROVE_BOOKING]: "bg-blue-100 text-blue-800",
  [OnboardingAction.REJECT_BOOKING]: "bg-orange-100 text-orange-800",
};

/** Icon paths for actions */
const ACTION_ICONS: Record<OnboardingAction, string> = {
  [OnboardingAction.APPROVE_INVESTOR]:
    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  [OnboardingAction.REJECT_INVESTOR]:
    "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
  [OnboardingAction.APPROVE_BOOKING]:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  [OnboardingAction.REJECT_BOOKING]:
    "M6 18L18 6M6 6l12 12",
};

export default function OnboardingMonitorPage() {
  // CRE config & live events
  const creConfig = useOnboardingReceiverConfig();
  const creTargets = useOnboardingReceiverTargets();
  const onboardingEvents = useWatchOnboardingReports();

  // Count events by type
  const investorApprovals = onboardingEvents.filter(
    (e) => e.action === OnboardingAction.APPROVE_INVESTOR,
  ).length;
  const investorRejections = onboardingEvents.filter(
    (e) => e.action === OnboardingAction.REJECT_INVESTOR,
  ).length;
  const bookingApprovals = onboardingEvents.filter(
    (e) => e.action === OnboardingAction.APPROVE_BOOKING,
  ).length;
  const bookingRejections = onboardingEvents.filter(
    (e) => e.action === OnboardingAction.REJECT_BOOKING,
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Onboarding Monitor
        </Heading>
        <Paragraph>
          Track CRE-automated investor approvals and booking decisions via
          Chainlink CRE.
        </Paragraph>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Investors Approved</p>
            <p className="text-2xl font-bold text-green-600">
              {investorApprovals}
            </p>
            <p className="text-xs text-gray-400">by CRE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Investors Rejected</p>
            <p className="text-2xl font-bold text-red-600">
              {investorRejections}
            </p>
            <p className="text-xs text-gray-400">by CRE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Bookings Approved</p>
            <p className="text-2xl font-bold text-blue-600">
              {bookingApprovals}
            </p>
            <p className="text-xs text-gray-400">by CRE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Bookings Rejected</p>
            <p className="text-2xl font-bold text-orange-600">
              {bookingRejections}
            </p>
            <p className="text-xs text-gray-400">by CRE</p>
          </CardContent>
        </Card>
      </div>

      {/* CRE Event Feed */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading as="h2">CRE Onboarding Events</Heading>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-500">Live</span>
            </div>
          </div>

          {onboardingEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-sm">
                No CRE onboarding events detected yet.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Events will appear here as Chainlink CRE auto-processes
                investor and booking requests.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {onboardingEvents.map((event, idx) => (
                <EventRow
                  key={`${event.transactionHash}-${idx}`}
                  event={event}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRE Receiver Configuration */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">
            Chainlink CRE OnboardingReceiver
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Forwarder</p>
              {creConfig.forwarderAddress ? (
                <ExplorerLink
                  value={creConfig.forwarderAddress}
                  type="address"
                  className="text-xs"
                />
              ) : (
                <p className="text-xs text-gray-400">Loading...</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">
                InvestorRequestManager Target
              </p>
              {creTargets.investorRequestManager ? (
                <ExplorerLink
                  value={creTargets.investorRequestManager}
                  type="address"
                  className="text-xs"
                />
              ) : (
                <p className="text-xs text-gray-400">Loading...</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">RentalBooking Target</p>
              {creTargets.rentalBooking ? (
                <ExplorerLink
                  value={creTargets.rentalBooking}
                  type="address"
                  className="text-xs"
                />
              ) : (
                <p className="text-xs text-gray-400">Loading...</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${creConfig.forwarderAddress ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className="text-xs">
                  {creConfig.forwarderAddress ? "Connected" : "Checking..."}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EventRow({ event }: { event: OnboardingReportEvent }) {
  const actionLabel =
    ONBOARDING_ACTION_LABELS[event.action] || `Action ${event.action}`;
  const colorClass =
    ACTION_COLORS[event.action] || "bg-gray-100 text-gray-800";
  const iconPath = ACTION_ICONS[event.action] || "";
  const time = new Date(Number(event.timestamp) * 1000);

  const isInvestorAction =
    event.action === OnboardingAction.APPROVE_INVESTOR ||
    event.action === OnboardingAction.REJECT_INVESTOR;

  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={iconPath}
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
            {actionLabel}
          </span>
          <span className="text-xs text-gray-400">
            {isInvestorAction ? "Investor" : "Booking"}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500">
            {time.toLocaleString()}
          </span>
          <ExplorerLink
            value={event.transactionHash}
            type="tx"
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}
