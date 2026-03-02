"use client";

import { useState } from "react";
import { Vehicle } from "@/types";
import { Card, CardContent, Button, Badge, Progress } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import {
  useOnChainVehicleStatus,
  useVehicleInfo,
  useLinkedTokens,
  VEHICLE_STATUS_LABELS,
} from "@/hooks/useVehicleData";
import { useTotalVehicleRevenue } from "@/hooks/useRentalOperations";
import { ExplorerLink } from "@/components/web3";

export interface VehicleManagementCardProps {
  vehicle: Vehicle;
  vehicleNftId?: bigint;
  onEdit?: (vehicleId: string) => void;
  onViewBookings?: (vehicleId: string) => void;
  onManageFundraising?: (vehicleId: string) => void;
  onDelete?: (vehicleId: string) => void;
  isDeleting?: boolean;
  className?: string;
}

export function VehicleManagementCard({
  vehicle,
  vehicleNftId,
  onEdit,
  onViewBookings,
  onManageFundraising,
  onDelete,
  isDeleting,
  className,
}: VehicleManagementCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const hasFundraising = vehicle.fundraising?.active;

  // On-chain data (only when NFT ID is available)
  const { data: onChainStatus } = useOnChainVehicleStatus(vehicleNftId);
  const { data: vehicleInfoData } = useVehicleInfo(vehicleNftId);
  const { data: linkedTokens } = useLinkedTokens(vehicleNftId);
  const { formatted: totalRevenue } = useTotalVehicleRevenue(vehicleNftId);

  const statusNum = onChainStatus !== undefined ? Number(onChainStatus) : undefined;
  const statusLabel = statusNum !== undefined ? VEHICLE_STATUS_LABELS[statusNum] : undefined;
  const vInfo = vehicleInfoData as any;
  const onChainMileage = vInfo?.[0]?.mileage ? Number(vInfo[0].mileage) : undefined;
  const maintenanceCount = vInfo?.[3] !== undefined ? Number(vInfo[3]) : undefined;
  const incidentCount = vInfo?.[4] !== undefined ? Number(vInfo[4]) : undefined;
  const tokens = linkedTokens as [`0x${string}`, `0x${string}`] | undefined;
  const fundingPercentage = hasFundraising
    ? (vehicle.fundraising!.currentAmount / vehicle.fundraising!.targetAmount) * 100
    : 0;

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex flex-col md:flex-row">
        {/* Vehicle Image */}
        <div className="relative w-full md:w-64 h-48 overflow-hidden">
          <img
            src={vehicle.image}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2">
            <Badge
              variant={vehicle.isAvailable ? "success" : "default"}
            >
              {vehicle.isAvailable ? "Available" : "Rented"}
            </Badge>
          </div>
          {hasFundraising && (
            <div className="absolute top-2 right-2">
              <Badge variant="default">
                {fundingPercentage.toFixed(0)}% Funded
              </Badge>
            </div>
          )}
        </div>

        {/* Vehicle Info & Actions */}
        <CardContent className="flex-1 p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-sm text-gray-600">
                {vehicle.year} · {vehicle.category} · {vehicle.location}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(vehicle._id)}
              >
                Edit
              </Button>
              {/* Delete button — hidden when fundraising is active */}
              {!hasFundraising && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={isDeleting}
                  className="text-red-600! border-red-200! hover:bg-red-50!"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Delete Confirmation */}
          {showConfirmDelete && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Delete {vehicle.brand} {vehicle.model}?</p>
                  <p className="text-xs text-red-600 mt-0.5">This will remove the vehicle from your fleet. This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onDelete?.(vehicle._id);
                    setShowConfirmDelete(false);
                  }}
                  disabled={isDeleting}
                  className="bg-red-600! hover:bg-red-700! text-white!"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Fundraising active — explain why delete is disabled */}
          {hasFundraising && (
            <div className="mb-4 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                This vehicle has an active fundraising campaign. Cancel the campaign before deleting.
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600">Price/Day</p>
              <p className="text-base font-semibold text-gray-900">
                {formatCurrency(vehicle.pricePerDay)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Revenue</p>
              <p className="text-base font-semibold text-green-600">
                {formatCurrency(vehicle.revenue?.totalEarned || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Distributed</p>
              <p className="text-base font-semibold text-blue-600">
                {formatCurrency(vehicle.revenue?.distributed || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Pending</p>
              <p className="text-base font-semibold text-orange-600">
                {formatCurrency(vehicle.revenue?.pending || 0)}
              </p>
            </div>
          </div>

          {/* Fundraising Progress */}
          {hasFundraising && vehicle.fundraising && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Fundraising</span>
                <span className="font-semibold">
                  {formatCurrency(vehicle.fundraising.currentAmount)} /{" "}
                  {formatCurrency(vehicle.fundraising.targetAmount)}
                </span>
              </div>
              <Progress value={fundingPercentage} variant="default" />
            </div>
          )}

          {/* On-Chain Data */}
          {vehicleNftId !== undefined && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-700">On-Chain Status</p>
                {statusLabel && (
                  <Badge variant={statusNum === 0 ? "success" : statusNum === 2 ? "warning" : "default"}>
                    {statusLabel}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {onChainMileage !== undefined && (
                  <div>
                    <span className="text-gray-500">Mileage</span>
                    <p className="font-semibold">{onChainMileage.toLocaleString()} km</p>
                  </div>
                )}
                {maintenanceCount !== undefined && (
                  <div>
                    <span className="text-gray-500">Maintenance</span>
                    <p className="font-semibold">{maintenanceCount} records</p>
                  </div>
                )}
                {incidentCount !== undefined && (
                  <div>
                    <span className="text-gray-500">Incidents</span>
                    <p className="font-semibold">{incidentCount} records</p>
                  </div>
                )}
                {parseFloat(totalRevenue) > 0 && (
                  <div>
                    <span className="text-gray-500">On-Chain Revenue</span>
                    <p className="font-semibold text-green-600">{totalRevenue} ETH</p>
                  </div>
                )}
              </div>
              {tokens && (
                <div className="flex flex-wrap gap-3 mt-2 text-xs">
                  {tokens[0] !== "0x0000000000000000000000000000000000000000" && (
                    <ExplorerLink value={tokens[0]} type="address" label="AssetToken" className="text-xs" />
                  )}
                  {tokens[1] !== "0x0000000000000000000000000000000000000000" && (
                    <ExplorerLink value={tokens[1]} type="address" label="RevenueToken" className="text-xs" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewBookings?.(vehicle._id)}
              className="flex-1"
            >
              View Bookings
            </Button>
            {hasFundraising ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => onManageFundraising?.(vehicle._id)}
                className="flex-1"
              >
                Manage Fundraising
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => onManageFundraising?.(vehicle._id)}
                className="flex-1"
              >
                Start Fundraising
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

// Skeleton loader
export function VehicleManagementCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-64 h-48 bg-gray-200 animate-pulse" />
        <CardContent className="flex-1 p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
            <div className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
