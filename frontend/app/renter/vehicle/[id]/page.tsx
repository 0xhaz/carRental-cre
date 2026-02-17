"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Heading, Paragraph, Button, Badge, Card, CardContent, Separator } from "@/components/ui";
import { BookingFlowEnhanced } from "@/components/renter";
import { ReviewList, ReviewStats, RoleSwitchModal } from "@/components/shared";
import { vehicleApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Vehicle, Review, UserRole } from "@/types";
import { toast } from "react-hot-toast";

export default function VehicleDetails() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews] = useState<Review[]>([]);

  useEffect(() => {
    const loadVehicle = async () => {
      setIsLoading(true);
      try {
        const res = await vehicleApi.getById(vehicleId);
        if (res.success && res.data) {
          setVehicle(res.data);
        } else {
          toast.error("Vehicle not found");
          router.push("/renter/browse");
        }
      } catch (error) {
        console.error("Failed to load vehicle:", error);
        toast.error("Failed to load vehicle details");
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicle();
  }, [vehicleId]);

  if (isLoading || !vehicle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-gray-200 rounded-lg" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    );
  }

  const images = [vehicle.image, vehicle.image, vehicle.image]; // Mock gallery

  // Mock data for properties not in Vehicle type yet
  const mockRating = 4.7;
  const mockInsurance = { amount: 15 };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/renter/browse")}
        className="mb-4"
      >
        ← Back to Browse
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Images & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <Card>
            <CardContent className="p-0">
              <div className="relative">
                <img
                  src={images[selectedImage]}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-96 object-cover rounded-t-lg"
                />
                <Badge
                  variant={vehicle.isAvailable ? "success" : "default"}
                  className="absolute top-4 left-4"
                >
                  {vehicle.isAvailable ? "Available" : "Not Available"}
                </Badge>
              </div>

              {/* Thumbnail Gallery */}
              <div className="grid grid-cols-3 gap-2 p-4">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? "border-primary" : "border-gray-200"
                    }`}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Details */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h1" className="mb-2">
                {vehicle.brand} {vehicle.model}
              </Heading>
              <div className="flex gap-2 mb-4">
                <Badge variant="outline">{vehicle.year}</Badge>
                <Badge variant="outline">{vehicle.category}</Badge>
                <Badge variant="outline">{vehicle.fuel_type}</Badge>
                <Badge variant="outline">{vehicle.transmission}</Badge>
              </div>

              <Paragraph className="text-lg mb-6">{vehicle.description}</Paragraph>

              <Separator className="my-6" />

              {/* Specifications */}
              <div>
                <Heading as="h3" className="mb-4">
                  Specifications
                </Heading>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-600">Seating Capacity</span>
                    <span className="font-semibold">{vehicle.seating_capacity}</span>
                  </div>
                  {vehicle.mileage && (
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-600">Mileage</span>
                      <span className="font-semibold">{vehicle.mileage.toLocaleString()} km</span>
                    </div>
                  )}
                  {vehicle.color && (
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-600">Color</span>
                      <span className="font-semibold">{vehicle.color}</span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-600">Fuel Type</span>
                    <span className="font-semibold">{vehicle.fuel_type}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-600">Transmission</span>
                    <span className="font-semibold">{vehicle.transmission}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-600">Category</span>
                    <span className="font-semibold">{vehicle.category}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Location */}
              <div>
                <Heading as="h3" className="mb-4">
                  Location
                </Heading>
                <div className="flex items-start gap-2">
                  <span className="text-gray-600">📍</span>
                  <div>
                    <p className="font-semibold">{vehicle.location}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <div className="space-y-6">
            <Heading as="h3">Customer Reviews</Heading>
            <div className="grid grid-cols-1 gap-6">
              <ReviewStats reviews={reviews} />
              <ReviewList reviews={reviews} />
            </div>
          </div>
        </div>

        {/* Right Column - Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold">
                      {formatCurrency(vehicle.pricePerDay)}
                    </span>
                    <span className="text-gray-600">/day</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    + {formatCurrency(mockInsurance.amount)} insurance
                  </p>
                </div>

                <Separator className="my-4" />

                {/* Fundraising Info (if applicable) — hide if fully funded or ended */}
                {vehicle.fundraising?.active &&
                 vehicle.fundraising.currentAmount < vehicle.fundraising.targetAmount &&
                 (!vehicle.fundraising.endDate || new Date(vehicle.fundraising.endDate) > new Date()) && (
                  <>
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        Investment Opportunity
                      </p>
                      <p className="text-xs text-blue-700">
                        This vehicle has active fundraising. You can also invest!
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => setShowRoleSwitchModal(true)}
                      >
                        View Investment Details
                      </Button>
                    </div>
                    <Separator className="my-4" />
                  </>
                )}

                {/* Quick Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-semibold">{vehicle.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-semibold">{mockRating} ★</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Trips:</span>
                    <span className="font-semibold">
                      {Math.floor(Math.random() * 50) + 10}
                    </span>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Book Button */}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!vehicle.isAvailable}
                  onClick={() => {
                    if (vehicle.isAvailable) {
                      setShowBookingFlow(true);
                    } else {
                      toast.error("This vehicle is currently unavailable");
                    }
                  }}
                >
                  {vehicle.isAvailable ? "Book Now" : "Not Available"}
                </Button>

                <p className="text-xs text-gray-600 text-center mt-3">
                  You won't be charged yet
                </p>

                {/* Owner Info */}
                <Separator className="my-4" />
                <div>
                  <p className="text-sm font-semibold mb-2">Hosted by:</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold">
                        {typeof vehicle.owner === "object" && (vehicle.owner as any).name
                          ? (vehicle.owner as any).name.slice(0, 2).toUpperCase()
                          : vehicle.owner.toString().slice(2, 4).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {typeof vehicle.owner === "object" && (vehicle.owner as any).name
                          ? (vehicle.owner as any).name
                          : `${vehicle.owner.toString().slice(0, 6)}...${vehicle.owner.toString().slice(-4)}`}
                      </p>
                      <p className="text-xs text-gray-600">Verified Owner</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Owner */}
            <Card className="mt-4">
              <CardContent className="p-4">
                <Button variant="outline" className="w-full">
                  Contact Owner
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Flow Modal */}
      {showBookingFlow && vehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <Heading as="h2">Book {vehicle.brand} {vehicle.model}</Heading>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBookingFlow(false)}
                >
                  ✕
                </Button>
              </div>
              <BookingFlowEnhanced
                vehicle={vehicle}
                onComplete={() => {
                  setShowBookingFlow(false);
                  toast.success("Booking request submitted!");
                  router.push("/renter/bookings");
                }}
                onCancel={() => setShowBookingFlow(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Role Switch Modal */}
      {showRoleSwitchModal && (
        <RoleSwitchModal
          targetRole={UserRole.INVESTOR}
          targetRoute="/investor/marketplace"
          onClose={() => setShowRoleSwitchModal(false)}
          title="Switch to Investor Role"
          message="To view investment opportunities, you need to switch to the Investor role. You can switch back anytime using the role switcher."
        />
      )}
    </div>
  );
}
