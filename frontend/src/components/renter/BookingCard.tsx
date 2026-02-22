import { Booking, Vehicle } from "@/types";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export interface BookingCardProps {
  booking: Booking;
  vehicle?: Vehicle;
  onCancel?: (bookingId: string) => void;
  onViewDetails?: (bookingId: string) => void;
  onLeaveReview?: (bookingId: string) => void;
  className?: string;
  basePath?: string; // e.g., "renter" or "rentor"
}

export function BookingCard({
  booking,
  vehicle,
  onCancel,
  onViewDetails,
  onLeaveReview,
  className,
  basePath = "renter",
}: BookingCardProps) {
  const statusColors = {
    pending: "warning",
    confirmed: "success",
    active: "success",
    completed: "default",
    cancelled: "error",
    disputed: "error",
  } as const;

  const isPast = new Date(booking.returnDate) < new Date();
  const isActive =
    new Date(booking.pickupDate) <= new Date() &&
    new Date(booking.returnDate) >= new Date();
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex flex-col md:flex-row">
        {/* Vehicle Image */}
        {vehicle && (
          <div className="relative w-full md:w-48 h-48 overflow-hidden">
            <Image
              src={vehicle.image || "/assets/car_image1.png"}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-full object-cover"
              width={192}
              height={192}
            />
            <div className="absolute top-2 left-2">
              <Badge variant={statusColors[booking.status]}>
                {booking.status}
              </Badge>
            </div>
            {isActive && (
              <div className="absolute top-2 right-2">
                <Badge variant="success">Active</Badge>
              </div>
            )}
          </div>
        )}

        <CardContent className="flex-1 p-6">
          {/* Booking Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Booking"}
              </h3>
              <p className="text-sm text-gray-600">
                Booking ID: {booking._id.slice(-8)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(booking.price)}
              </p>
              <p className="text-xs text-gray-600">Total Price</p>
            </div>
          </div>

          {/* Booking Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600">Pickup</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(booking.pickupDate)}
              </p>
              {vehicle && <p className="text-xs text-gray-600">{vehicle.location}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-600">Return</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(booking.returnDate)}
              </p>
              {vehicle && <p className="text-xs text-gray-600">{vehicle.location}</p>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Link href={`/${basePath}/booking/${booking._id}`} className="flex-1">
              <Button variant="outline" className="w-full" size="sm">
                View Details
              </Button>
            </Link>
            {canCancel && !isPast && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel?.(booking._id)}
                className="flex-1"
              >
                Cancel Booking
              </Button>
            )}
            {(booking.status === "completed" || isPast) && (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => onLeaveReview?.(booking._id)}
              >
                Leave Review
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

// Skeleton loader
export function BookingCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-48 h-48 bg-gray-200 animate-pulse" />
        <CardContent className="flex-1 p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
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
