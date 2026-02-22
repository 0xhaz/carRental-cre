import { Vehicle } from "@/types";
import { Card, Badge, StarRating } from "@/components/ui";
import { assets } from "@/constants/menuLinks";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export interface VehicleCardProps {
  vehicle: Vehicle;
  onBook?: (id: string) => void;
  showPrice?: boolean;
  className?: string;
}

export function VehicleCard({
  vehicle,
  onBook,
  showPrice = true,
  className,
}: VehicleCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onBook) {
      e.preventDefault();
      onBook(vehicle._id);
    }
  };

  return (
    <Link href={`/renter/vehicle/${vehicle._id}`} onClick={handleClick}>
      <Card
        className={`group overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-500 cursor-pointer ${className}`}
      >
        {/* Vehicle Image */}
        <div className="relative h-48 overflow-hidden">
          <Image
            src={vehicle.image || assets.car_image1}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            width={400}
            height={300}
          />

          {/* Availability Badge */}
          {vehicle.isAvailable && (
            <div className="absolute top-4 left-4">
              <Badge variant="success" className="shadow-lg">
                Available Now
              </Badge>
            </div>
          )}

          {/* Price Badge */}
          {showPrice && (
            <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-lg">
              <span className="font-semibold">
                {formatCurrency(vehicle.pricePerDay)}
              </span>
              <span className="text-sm text-white/80"> / day</span>
            </div>
          )}
        </div>

        {/* Vehicle Info */}
        <div className="p-4 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-gray-600 text-sm">
                {vehicle.category} · {vehicle.year}
              </p>
            </div>
          </div>

          {/* Rating */}
          {vehicle.reviewCount != null && vehicle.reviewCount > 0 && (
            <div className="mt-2 mb-3">
              <StarRating
                rating={vehicle.averageRating || 0}
                size="sm"
                showCount
                reviewCount={vehicle.reviewCount}
              />
            </div>
          )}

          {/* Vehicle Specs Grid */}
          <div className="mt-4 grid grid-cols-2 gap-y-2 text-gray-600">
            <div className="flex items-center text-sm">
              <Image
                src={assets.users_icon}
                alt="Seats"
                className="h-4 mr-2"
                width={16}
                height={16}
              />
              <span>{vehicle.seating_capacity} Seats</span>
            </div>
            <div className="flex items-center text-sm">
              <Image
                src={assets.fuel_icon}
                alt="Fuel"
                className="h-4 mr-2"
                width={16}
                height={16}
              />
              <span>{vehicle.fuel_type}</span>
            </div>
            <div className="flex items-center text-sm">
              <Image
                src={assets.car_icon}
                alt="Transmission"
                className="h-4 mr-2"
                width={16}
                height={16}
              />
              <span>{vehicle.transmission}</span>
            </div>
            <div className="flex items-center text-sm">
              <Image
                src={assets.location_icon}
                alt="Location"
                className="h-4 mr-2"
                width={16}
                height={16}
              />
              <span>{vehicle.location}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Skeleton loader for VehicleCard
export function VehicleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-48 bg-gray-200 animate-pulse" />
      <div className="p-4 sm:p-5 space-y-3">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="grid grid-cols-2 gap-2 mt-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </Card>
  );
}
