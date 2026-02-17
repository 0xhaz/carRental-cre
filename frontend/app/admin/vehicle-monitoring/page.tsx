"use client";

import { useState } from "react";
import {
  Heading,
  Paragraph,
  Card,
  CardContent,
  Input,
  Button,
  Badge,
} from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import { useVehicleMetadata, useVehicleInfo } from "@/hooks/useVehicleData";
import {
  useVehicleReceiverConfig,
  useVehicleReceiverTarget,
  useWatchVehicleReports,
} from "@/hooks/useCRE";
import {
  VehicleAction,
  VEHICLE_ACTION_LABELS,
  type VehicleReportEvent,
} from "@/types/cre";

/** Color mapping for vehicle actions */
const ACTION_COLORS: Record<VehicleAction, string> = {
  [VehicleAction.UPDATE_MILEAGE]: "bg-blue-100 text-blue-800",
  [VehicleAction.RECORD_MAINTENANCE]: "bg-amber-100 text-amber-800",
  [VehicleAction.RECORD_INCIDENT]: "bg-red-100 text-red-800",
  [VehicleAction.RESOLVE_INCIDENT]: "bg-green-100 text-green-800",
  [VehicleAction.UPDATE_METADATA]: "bg-purple-100 text-purple-800",
};

/** Action icons */
const ACTION_ICONS: Record<VehicleAction, string> = {
  [VehicleAction.UPDATE_MILEAGE]: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  [VehicleAction.RECORD_MAINTENANCE]:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  [VehicleAction.RECORD_INCIDENT]:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  [VehicleAction.RESOLVE_INCIDENT]:
    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  [VehicleAction.UPDATE_METADATA]:
    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
};

/** Vehicle status label/color from on-chain enum */
const VEHICLE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: "Active", color: "success" },
  1: { label: "In Rental", color: "warning" },
  2: { label: "Maintenance", color: "warning" },
  3: { label: "Suspended", color: "error" },
  4: { label: "Deregistered", color: "default" },
};

export default function VehicleMonitoringPage() {
  const [vehicleIdInput, setVehicleIdInput] = useState("");
  const [activeVehicleId, setActiveVehicleId] = useState<bigint | null>(null);

  const handleLookup = () => {
    const id = parseInt(vehicleIdInput);
    if (isNaN(id) || id < 0) return;
    setActiveVehicleId(BigInt(id));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Vehicle Monitoring
        </Heading>
        <Paragraph>
          Monitor vehicle telematics, maintenance records, and incidents via
          Chainlink CRE.
        </Paragraph>
      </div>

      {/* Vehicle Lookup */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <Heading as="h2" className="mb-4">
            Vehicle Lookup
          </Heading>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                type="number"
                label="Vehicle NFT ID"
                placeholder="Enter vehicle token ID"
                value={vehicleIdInput}
                onChange={(e) => setVehicleIdInput(e.target.value)}
                min={0}
              />
            </div>
            <Button onClick={handleLookup} disabled={!vehicleIdInput}>
              Look Up
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeVehicleId !== null && (
        <VehicleDashboard vehicleId={activeVehicleId} />
      )}
    </div>
  );
}

function VehicleDashboard({ vehicleId }: { vehicleId: bigint }) {
  // On-chain vehicle data
  const metadata = useVehicleMetadata(vehicleId);
  const vehicleInfo = useVehicleInfo(vehicleId);

  // CRE receiver state
  const creConfig = useVehicleReceiverConfig();
  const creTarget = useVehicleReceiverTarget();

  // Live CRE events
  const vehicleEvents = useWatchVehicleReports();

  // Filter events for this vehicle
  const myEvents = vehicleEvents.filter(
    (e) => e.tokenId === vehicleId,
  );

  // Parse metadata tuple
  const meta = metadata.data as
    | [string, string, string, bigint, string, bigint, bigint, bigint]
    | undefined;
  const vin = meta?.[0];
  const make = meta?.[1];
  const model = meta?.[2];
  const year = meta?.[3];
  const color = meta?.[4];
  const mileage = meta?.[5];
  const registrationExpiry = meta?.[6];
  const insuranceExpiry = meta?.[7];

  // Parse vehicleInfo tuple: (metadata, status, currentBooking, maintenanceCount, incidentCount)
  const info = vehicleInfo.data as [any, number, bigint, bigint, bigint] | undefined;
  const status = info?.[1];
  const currentBooking = info?.[2];
  const maintenanceCount = info?.[3];
  const incidentCount = info?.[4];

  const isLoading = metadata.isLoading || vehicleInfo.isLoading;
  const isError = metadata.isError || vehicleInfo.isError;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !meta) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">
            Vehicle NFT #{vehicleId.toString()} not found or not yet minted.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = VEHICLE_STATUS[status ?? 0] || VEHICLE_STATUS[0];
  const now = BigInt(Math.floor(Date.now() / 1000));
  const regExpired = registrationExpiry ? registrationExpiry < now : false;
  const insExpired = insuranceExpiry ? insuranceExpiry < now : false;

  // Count events by type
  const mileageUpdates = myEvents.filter(
    (e) => e.action === VehicleAction.UPDATE_MILEAGE,
  ).length;
  const maintenanceEvents = myEvents.filter(
    (e) => e.action === VehicleAction.RECORD_MAINTENANCE,
  ).length;
  const incidentEvents = myEvents.filter(
    (e) => e.action === VehicleAction.RECORD_INCIDENT,
  ).length;
  const resolvedEvents = myEvents.filter(
    (e) => e.action === VehicleAction.RESOLVE_INCIDENT,
  ).length;

  return (
    <div className="space-y-6">
      {/* Vehicle Identity */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading as="h2">
              {make} {model} ({year?.toString()})
            </Heading>
            <Badge variant={statusInfo.color as any}>{statusInfo.label}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">VIN</p>
              <p className="text-sm font-mono font-medium">{vin}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Color</p>
              <p className="text-sm font-medium">{color}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Token ID</p>
              <p className="text-sm font-mono font-medium">
                #{vehicleId.toString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Booking</p>
              <p className="text-sm font-mono font-medium">
                {currentBooking && currentBooking > BigInt(0)
                  ? `#${currentBooking.toString()}`
                  : "None"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telematics Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Mileage</p>
            <p className="text-2xl font-bold text-blue-600">
              {mileage?.toString() ?? "—"}
            </p>
            <p className="text-xs text-gray-400">km</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Maintenance</p>
            <p className="text-2xl font-bold text-amber-600">
              {maintenanceCount?.toString() ?? "0"}
            </p>
            <p className="text-xs text-gray-400">records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Incidents</p>
            <p className="text-2xl font-bold text-red-600">
              {incidentCount?.toString() ?? "0"}
            </p>
            <p className="text-xs text-gray-400">reported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">CRE Events</p>
            <p className="text-2xl font-bold text-purple-600">
              {myEvents.length}
            </p>
            <p className="text-xs text-gray-400">live</p>
          </CardContent>
        </Card>
      </div>

      {/* Expiry Alerts */}
      {(regExpired || insExpired) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm font-medium text-red-800">
                Compliance Alerts
              </p>
            </div>
            <div className="space-y-1">
              {regExpired && (
                <p className="text-xs text-red-700">
                  Registration expired on{" "}
                  {new Date(
                    Number(registrationExpiry) * 1000,
                  ).toLocaleDateString()}
                </p>
              )}
              {insExpired && (
                <p className="text-xs text-red-700">
                  Insurance expired on{" "}
                  {new Date(
                    Number(insuranceExpiry) * 1000,
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration & Insurance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Registration Expiry</p>
            <p
              className={`text-sm font-medium ${regExpired ? "text-red-600" : "text-green-600"}`}
            >
              {registrationExpiry
                ? new Date(
                    Number(registrationExpiry) * 1000,
                  ).toLocaleDateString()
                : "Not set"}
            </p>
            {!regExpired && registrationExpiry && (
              <Badge variant="success" className="mt-1">
                Valid
              </Badge>
            )}
            {regExpired && (
              <Badge variant="error" className="mt-1">
                Expired
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Insurance Expiry</p>
            <p
              className={`text-sm font-medium ${insExpired ? "text-red-600" : "text-green-600"}`}
            >
              {insuranceExpiry
                ? new Date(
                    Number(insuranceExpiry) * 1000,
                  ).toLocaleDateString()
                : "Not set"}
            </p>
            {!insExpired && insuranceExpiry && (
              <Badge variant="success" className="mt-1">
                Valid
              </Badge>
            )}
            {insExpired && (
              <Badge variant="error" className="mt-1">
                Expired
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CRE Event Feed */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading as="h2">CRE Event Feed</Heading>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-500">Live</span>
            </div>
          </div>

          {/* Event summary bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            {mileageUpdates > 0 && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {mileageUpdates} mileage
              </span>
            )}
            {maintenanceEvents > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {maintenanceEvents} maintenance
              </span>
            )}
            {incidentEvents > 0 && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                {incidentEvents} incidents
              </span>
            )}
            {resolvedEvents > 0 && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                {resolvedEvents} resolved
              </span>
            )}
          </div>

          {myEvents.length === 0 ? (
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
                No CRE events detected yet for this vehicle.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Events will appear here as Chainlink CRE processes vehicle
                reports.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {myEvents.map((event, idx) => (
                <EventRow key={`${event.transactionHash}-${idx}`} event={event} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRE Receiver Config */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">
            Chainlink CRE VehicleReceiver
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
              <p className="text-xs text-gray-500">Target VehicleNFT</p>
              {creTarget.data ? (
                <ExplorerLink
                  value={creTarget.data as `0x${string}`}
                  type="address"
                  className="text-xs"
                />
              ) : (
                <p className="text-xs text-gray-400">Loading...</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Workflow Author</p>
              {creConfig.expectedAuthor ? (
                <ExplorerLink
                  value={creConfig.expectedAuthor}
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

function EventRow({ event }: { event: VehicleReportEvent }) {
  const actionLabel = VEHICLE_ACTION_LABELS[event.action] || `Action ${event.action}`;
  const colorClass = ACTION_COLORS[event.action] || "bg-gray-100 text-gray-800";
  const iconPath = ACTION_ICONS[event.action] || "";
  const time = new Date(Number(event.timestamp) * 1000);

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
            Token #{event.tokenId.toString()}
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
