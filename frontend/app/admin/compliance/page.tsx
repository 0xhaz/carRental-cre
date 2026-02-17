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
import {
  useValidateRenter,
  useIsRenterBlacklisted,
  useRenterIncidentCount,
  useRenterRequirements,
  useValidateVehicle,
  useIsVehicleOperational,
  useVehicleOperationalData,
} from "@/hooks/useCompliance";
import {
  useComplianceReceiverConfig,
  useComplianceReceiverTargets,
  useWatchComplianceReports,
} from "@/hooks/useCRE";
import {
  ComplianceAction,
  COMPLIANCE_ACTION_LABELS,
  type ComplianceReportEvent,
} from "@/types/cre";

/** Color mapping for compliance actions */
const ACTION_COLORS: Record<ComplianceAction, string> = {
  [ComplianceAction.RECORD_INCIDENT]: "bg-red-100 text-red-800",
  [ComplianceAction.BLACKLIST_RENTER]: "bg-red-200 text-red-900",
  [ComplianceAction.REMOVE_BLACKLIST]: "bg-green-100 text-green-800",
  [ComplianceAction.RENEW_REGISTRATION]: "bg-blue-100 text-blue-800",
  [ComplianceAction.RENEW_INSURANCE]: "bg-blue-100 text-blue-800",
  [ComplianceAction.RECORD_MAINTENANCE]: "bg-amber-100 text-amber-800",
  [ComplianceAction.SUSPEND_VEHICLE]: "bg-orange-100 text-orange-800",
  [ComplianceAction.LIFT_SUSPENSION]: "bg-green-100 text-green-800",
};

/** Renter validation reason labels */
const VALIDATION_REASONS: Record<number, string> = {
  0: "Valid",
  1: "Age Too Low",
  2: "Driver License Expired",
  3: "Driver License Suspended",
  4: "No Driver License",
  5: "Insurance Not Verified",
  6: "Insurance Expired",
  7: "Credit Score Insufficient",
  8: "Too Many Recent Incidents",
  9: "Blacklisted",
  10: "Identity Not Verified",
};

/** Vehicle operational status labels */
const VEHICLE_OP_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: "Unregistered", color: "default" },
  1: { label: "Operational", color: "success" },
  2: { label: "Maintenance Due", color: "warning" },
  3: { label: "Maintenance Overdue", color: "error" },
  4: { label: "Insurance Expired", color: "error" },
  5: { label: "Registration Expired", color: "error" },
  6: { label: "No Permit", color: "warning" },
  7: { label: "Suspended", color: "error" },
  8: { label: "Decommissioned", color: "default" },
};

export default function ComplianceDashboardPage() {
  const [renterAddressInput, setRenterAddressInput] = useState("");
  const [activeRenterAddress, setActiveRenterAddress] = useState<
    `0x${string}` | null
  >(null);
  const [vehicleIdInput, setVehicleIdInput] = useState("");
  const [activeVehicleId, setActiveVehicleId] = useState<bigint | null>(null);

  // CRE config & live events
  const creConfig = useComplianceReceiverConfig();
  const creTargets = useComplianceReceiverTargets();
  const complianceEvents = useWatchComplianceReports();

  const handleRenterLookup = () => {
    const addr = renterAddressInput.trim();
    if (!addr.startsWith("0x") || addr.length !== 42) return;
    setActiveRenterAddress(addr as `0x${string}`);
  };

  const handleVehicleLookup = () => {
    const id = parseInt(vehicleIdInput);
    if (isNaN(id) || id < 0) return;
    setActiveVehicleId(BigInt(id));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Compliance Dashboard
        </Heading>
        <Paragraph>
          Monitor renter compliance, vehicle operational status, and Chainlink
          CRE compliance events.
        </Paragraph>
      </div>

      {/* CRE Event Feed */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading as="h2">CRE Compliance Events</Heading>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-500">Live</span>
            </div>
          </div>

          {complianceEvents.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <svg
                className="w-10 h-10 mx-auto mb-2 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <p className="text-sm">No CRE compliance events detected yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Events appear here as Chainlink CRE processes compliance
                reports.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {complianceEvents.map((event, idx) => {
                const actionLabel =
                  COMPLIANCE_ACTION_LABELS[event.action] ||
                  `Action ${event.action}`;
                const colorClass =
                  ACTION_COLORS[event.action] || "bg-gray-100 text-gray-800";
                const time = new Date(Number(event.timestamp) * 1000);

                return (
                  <div
                    key={`${event.transactionHash}-${idx}`}
                    className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100"
                  >
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${colorClass}`}
                    >
                      {actionLabel}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {time.toLocaleString()}
                    </span>
                    <ExplorerLink
                      value={event.transactionHash}
                      type="tx"
                      className="text-xs"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Renter Compliance Lookup */}
        <Card>
          <CardContent className="p-6">
            <Heading as="h2" className="mb-4">
              Renter Compliance
            </Heading>
            <div className="flex gap-3 items-end mb-4">
              <div className="flex-1">
                <Input
                  type="text"
                  label="Renter Wallet Address"
                  placeholder="0x..."
                  value={renterAddressInput}
                  onChange={(e) => setRenterAddressInput(e.target.value)}
                />
              </div>
              <Button
                onClick={handleRenterLookup}
                disabled={
                  !renterAddressInput.startsWith("0x") ||
                  renterAddressInput.length !== 42
                }
              >
                Check
              </Button>
            </div>

            {activeRenterAddress && (
              <RenterComplianceResult address={activeRenterAddress} />
            )}
          </CardContent>
        </Card>

        {/* Vehicle Compliance Lookup */}
        <Card>
          <CardContent className="p-6">
            <Heading as="h2" className="mb-4">
              Vehicle Compliance
            </Heading>
            <div className="flex gap-3 items-end mb-4">
              <div className="flex-1">
                <Input
                  type="number"
                  label="Vehicle NFT ID"
                  placeholder="Enter token ID"
                  value={vehicleIdInput}
                  onChange={(e) => setVehicleIdInput(e.target.value)}
                  min={0}
                />
              </div>
              <Button onClick={handleVehicleLookup} disabled={!vehicleIdInput}>
                Check
              </Button>
            </div>

            {activeVehicleId !== null && (
              <VehicleComplianceResult vehicleId={activeVehicleId} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* CRE Receiver Configuration */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">
            Chainlink CRE ComplianceReceiver
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
              <p className="text-xs text-gray-500">RenterCompliance Target</p>
              {creTargets.renterCompliance ? (
                <ExplorerLink
                  value={creTargets.renterCompliance}
                  type="address"
                  className="text-xs"
                />
              ) : (
                <p className="text-xs text-gray-400">Loading...</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">
                OperationalCompliance Target
              </p>
              {creTargets.operationalCompliance ? (
                <ExplorerLink
                  value={creTargets.operationalCompliance}
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

function RenterComplianceResult({ address }: { address: `0x${string}` }) {
  const validation = useValidateRenter(address);
  const blacklisted = useIsRenterBlacklisted(address);
  const incidentCount = useRenterIncidentCount(address);

  const isLoading =
    validation.isLoading || blacklisted.isLoading || incidentCount.isLoading;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3 pt-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (validation.isError) {
    return (
      <p className="text-sm text-gray-500 pt-2">
        Unable to fetch compliance data for this address. The address may not be
        registered.
      </p>
    );
  }

  // Parse validation result: struct RenterValidationResult { bool isValid, RenterValidationReason reason, ... }
  const result = validation.data as
    | { isValid: boolean; reason: number }
    | [boolean, number]
    | undefined;
  const isValid = Array.isArray(result) ? result[0] : result?.isValid;
  const reason = Array.isArray(result) ? result[1] : result?.reason;
  const isBlacklisted = blacklisted.data as boolean | undefined;
  const incidents = incidentCount.data as bigint | undefined;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Overall Status</span>
        <Badge variant={isValid ? "success" : "error"}>
          {isValid ? "Compliant" : "Non-Compliant"}
        </Badge>
      </div>

      {reason !== undefined && reason !== 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Reason</span>
          <span className="text-sm text-red-600 font-medium">
            {VALIDATION_REASONS[reason] || `Code ${reason}`}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Blacklisted</span>
        <Badge variant={isBlacklisted ? "error" : "success"}>
          {isBlacklisted ? "Yes" : "No"}
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Incidents</span>
        <span className="text-sm font-medium">
          {incidents?.toString() ?? "0"}
        </span>
      </div>

      <div className="pt-2 border-t">
        <ExplorerLink value={address} type="address" className="text-xs" />
      </div>
    </div>
  );
}

function VehicleComplianceResult({ vehicleId }: { vehicleId: bigint }) {
  const validation = useValidateVehicle(vehicleId);
  const isOperational = useIsVehicleOperational(vehicleId);
  const opData = useVehicleOperationalData(vehicleId);

  const isLoading =
    validation.isLoading || isOperational.isLoading || opData.isLoading;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3 pt-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (validation.isError) {
    return (
      <p className="text-sm text-gray-500 pt-2">
        Unable to fetch compliance data for Vehicle #{vehicleId.toString()}.
        The vehicle may not be registered in OperationalCompliance.
      </p>
    );
  }

  // Parse validation result
  const result = validation.data as
    | { isValid: boolean; reason: number; status: number }
    | [boolean, number, number]
    | undefined;
  const isValid = Array.isArray(result) ? result[0] : result?.isValid;
  const reason = Array.isArray(result) ? result[1] : result?.reason;
  const status = Array.isArray(result) ? result[2] : result?.status;
  const operational = isOperational.data as boolean | undefined;

  // Parse operational data
  const data = opData.data as any;
  const registrationExpiry = data?.registrationExpiry ?? data?.[1];
  const insuranceExpiry = data?.insuranceExpiry ?? data?.[2];
  const nextMaintenance = data?.nextMaintenanceDate ?? data?.[3];
  const isSuspended = data?.isSuspended ?? data?.[5];

  const now = BigInt(Math.floor(Date.now() / 1000));
  const statusInfo =
    VEHICLE_OP_STATUS[status ?? 0] || VEHICLE_OP_STATUS[0];

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Operational Status</span>
        <Badge variant={statusInfo.color as any}>{statusInfo.label}</Badge>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Can Operate</span>
        <Badge variant={operational ? "success" : "error"}>
          {operational ? "Yes" : "No"}
        </Badge>
      </div>

      {isSuspended && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <p className="text-xs text-red-800 font-medium">
            Vehicle is currently suspended
          </p>
        </div>
      )}

      {registrationExpiry && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Registration</span>
          <span
            className={`text-sm font-medium ${
              BigInt(registrationExpiry) < now
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {BigInt(registrationExpiry) < now ? "Expired" : "Valid"} —{" "}
            {new Date(Number(registrationExpiry) * 1000).toLocaleDateString()}
          </span>
        </div>
      )}

      {insuranceExpiry && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Insurance</span>
          <span
            className={`text-sm font-medium ${
              BigInt(insuranceExpiry) < now
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {BigInt(insuranceExpiry) < now ? "Expired" : "Valid"} —{" "}
            {new Date(Number(insuranceExpiry) * 1000).toLocaleDateString()}
          </span>
        </div>
      )}

      {nextMaintenance && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Next Maintenance</span>
          <span
            className={`text-sm font-medium ${
              BigInt(nextMaintenance) < now
                ? "text-amber-600"
                : "text-green-600"
            }`}
          >
            {BigInt(nextMaintenance) < now ? "Overdue" : "Scheduled"} —{" "}
            {new Date(Number(nextMaintenance) * 1000).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
