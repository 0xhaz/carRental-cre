import { Vehicle } from "@/src/types";
import { Card, CardContent, Button, Badge, Progress } from "@/src/components/ui";
import { formatCurrency } from "@/src/lib/utils";
import Image from "next/image";
import Link from "next/link";

export interface VehicleManagementCardProps {
  vehicle: Vehicle;
  onEdit?: (vehicleId: string) => void;
  onViewBookings?: (vehicleId: string) => void;
  onManageFundraising?: (vehicleId: string) => void;
  className?: string;
}

export function VehicleManagementCard({
  vehicle,
  onEdit,
  onViewBookings,
  onManageFundraising,
  className,
}: VehicleManagementCardProps) {
  const hasFundraising = vehicle.fundraising?.active;
  const fundingPercentage = hasFundraising
    ? (vehicle.fundraising!.currentAmount / vehicle.fundraising!.targetAmount) * 100
    : 0;

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex flex-col md:flex-row">
        {/* Vehicle Image */}
        <div className="relative w-full md:w-64 h-48 overflow-hidden">
          <Image
            src={vehicle.image || "/assets/car_image1.png"}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover"
            width={256}
            height={192}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(vehicle._id)}
            >
              Edit
            </Button>
          </div>

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
