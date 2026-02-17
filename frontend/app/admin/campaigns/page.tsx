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
  useCampaignMonitorConfig,
  useCampaignMonitorProtocol,
  useWatchCampaignReports,
} from "@/hooks/useCRE";
import type { CampaignReportEvent } from "@/types/cre";

/** Color mapping for campaign actions */
const ACTION_COLORS: Record<string, string> = {
  CAMPAIGN_FAILED: "bg-red-100 text-red-800",
  CAMPAIGN_CANCELLED: "bg-orange-100 text-orange-800",
};

/** Icon paths for campaign actions */
const ACTION_ICONS: Record<string, string> = {
  CAMPAIGN_FAILED:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  CAMPAIGN_CANCELLED:
    "M6 18L18 6M6 6l12 12",
};

export default function CampaignMonitorPage() {
  const creConfig = useCampaignMonitorConfig();
  const protocolResult = useCampaignMonitorProtocol();
  const campaignEvents = useWatchCampaignReports();

  // Count events by type
  const failedCount = campaignEvents.filter(
    (e) => e.action === "CAMPAIGN_FAILED",
  ).length;
  const cancelledCount = campaignEvents.filter(
    (e) => e.action === "CAMPAIGN_CANCELLED",
  ).length;
  const totalRefunded = campaignEvents.reduce(
    (sum, e) => sum + Number(e.refundedCount),
    0,
  );

  const protocolAddress = protocolResult.data as `0x${string}` | undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Campaign Monitor
        </Heading>
        <Paragraph>
          Track CRE-automated campaign failure detection and batch refund
          processing via Chainlink CRE.
        </Paragraph>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Campaigns Failed</p>
            <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            <p className="text-xs text-gray-400">detected by CRE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Campaigns Cancelled</p>
            <p className="text-2xl font-bold text-orange-600">
              {cancelledCount}
            </p>
            <p className="text-xs text-gray-400">processed by CRE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Events</p>
            <p className="text-2xl font-bold text-gray-700">
              {campaignEvents.length}
            </p>
            <p className="text-xs text-gray-400">campaign reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Investors Refunded</p>
            <p className="text-2xl font-bold text-blue-600">{totalRefunded}</p>
            <p className="text-xs text-gray-400">batch refunds</p>
          </CardContent>
        </Card>
      </div>

      {/* CRE Event Feed */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading as="h2">CRE Campaign Events</Heading>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-500">Live</span>
            </div>
          </div>

          {campaignEvents.length === 0 ? (
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm">
                No CRE campaign events detected yet.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Events will appear here when Chainlink CRE detects campaign
                failures or cancellations and processes batch refunds.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {campaignEvents.map((event, idx) => (
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
            Chainlink CRE CampaignMonitorReceiver
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
                PaymentProtocol Target
              </p>
              {protocolAddress ? (
                <ExplorerLink
                  value={protocolAddress}
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

function EventRow({ event }: { event: CampaignReportEvent }) {
  const colorClass =
    ACTION_COLORS[event.action] || "bg-gray-100 text-gray-800";
  const iconPath = ACTION_ICONS[event.action] || "";
  const time = new Date(Number(event.timestamp) * 1000);
  const label =
    event.action === "CAMPAIGN_FAILED"
      ? "Campaign Failed"
      : "Campaign Cancelled";

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
            {label}
          </span>
          <span className="text-xs text-gray-500">
            Vehicle #{event.vehicleId.toString()}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500">
            {Number(event.refundedCount)} investors refunded
          </span>
          <span className="text-xs text-gray-400">
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
