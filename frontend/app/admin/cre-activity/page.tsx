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
import { useCREActivityFeed } from "@/hooks/useCRE";
import type { CREActivityItem, CREEventType } from "@/types/cre";
import Link from "next/link";
import { toast } from "react-hot-toast";

/** Colors per event type */
const TYPE_STYLES: Record<CREEventType, { bg: string; text: string; dot: string; label: string }> = {
  payment:    { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500",  label: "Payment" },
  compliance: { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500", label: "Compliance" },
  vehicle:    { bg: "bg-cyan-100",   text: "text-cyan-800",   dot: "bg-cyan-500",   label: "Vehicle" },
  onboarding: { bg: "bg-emerald-100",text: "text-emerald-800",dot: "bg-emerald-500",label: "Onboarding" },
  campaign:   { bg: "bg-rose-100",   text: "text-rose-800",   dot: "bg-rose-500",   label: "Campaign" },
};

/** Icon paths per event type */
const TYPE_ICONS: Record<CREEventType, string> = {
  payment:    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  compliance: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  vehicle:    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  onboarding: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  campaign:   "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
};

/** Links to detail pages */
const TYPE_LINKS: Record<CREEventType, string> = {
  payment:    "/admin/milestones",
  compliance: "/admin/compliance",
  vehicle:    "/admin/vehicle-monitoring",
  onboarding: "/admin/onboarding",
  campaign:   "/admin/campaigns",
};

type FilterType = "all" | CREEventType;

export default function CREActivityPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const { feed, counts } = useCREActivityFeed((item) => {
    toast(
      `CRE: ${item.label}`,
      {
        icon: "⚡",
        duration: 4000,
        position: "bottom-right",
      },
    );
  });

  const filteredFeed = filter === "all"
    ? feed
    : feed.filter((item) => item.type === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: `All (${counts.total})` },
    { key: "payment", label: `Payment (${counts.payment})` },
    { key: "compliance", label: `Compliance (${counts.compliance})` },
    { key: "vehicle", label: `Vehicle (${counts.vehicle})` },
    { key: "onboarding", label: `Onboarding (${counts.onboarding})` },
    { key: "campaign", label: `Campaign (${counts.campaign})` },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          CRE Activity Feed
        </Heading>
        <Paragraph>
          Unified real-time stream of all Chainlink CRE receiver events across
          payments, compliance, vehicles, onboarding, and campaigns.
        </Paragraph>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(Object.keys(TYPE_STYLES) as CREEventType[]).map((type) => {
          const style = TYPE_STYLES[type];
          return (
            <Link key={type} href={TYPE_LINKS[type]}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-3 text-center">
                  <div className={`inline-flex items-center gap-1.5 mb-1`}>
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className="text-xs text-gray-500">{style.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${style.text}`}>
                    {counts[type]}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Live Event Feed */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading as="h2">Live Events</Heading>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-500">
                Watching all 5 receivers
              </span>
            </div>
          </div>

          {filteredFeed.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <p className="text-sm font-medium">
                {filter === "all"
                  ? "No CRE events detected yet"
                  : `No ${filter} events detected yet`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Events will stream here in real-time as Chainlink CRE processes
                on-chain reports across all 5 receiver contracts.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredFeed.map((item, idx) => (
                <ActivityRow
                  key={`${item.transactionHash}-${item.type}-${idx}`}
                  item={item}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receiver Health */}
      <Card className="mt-6 bg-gray-50">
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">
            Receiver Status
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {(Object.keys(TYPE_STYLES) as CREEventType[]).map((type) => {
              const style = TYPE_STYLES[type];
              const hasEvents = counts[type] > 0;
              return (
                <Link
                  key={type}
                  href={TYPE_LINKS[type]}
                  className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-300 transition-colors"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${hasEvents ? style.dot : "bg-gray-300"} ${hasEvents ? "animate-pulse" : ""}`}
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {style.label}Receiver
                    </p>
                    <p className="text-xs text-gray-500">
                      {hasEvents
                        ? `${counts[type]} event${counts[type] !== 1 ? "s" : ""}`
                        : "Listening..."}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityRow({ item }: { item: CREActivityItem }) {
  const style = TYPE_STYLES[item.type];
  const iconPath = TYPE_ICONS[item.type];
  const time = new Date(Number(item.timestamp) * 1000);

  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}
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
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
          >
            {style.label}
          </span>
          <span className="text-sm font-medium text-gray-900">
            {item.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-400">{time.toLocaleString()}</span>
          <span className="text-xs text-gray-300">
            Block {item.blockNumber.toString()}
          </span>
          <ExplorerLink
            value={item.transactionHash}
            type="tx"
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}
