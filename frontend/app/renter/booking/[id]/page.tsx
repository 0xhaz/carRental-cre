"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Heading,
  Paragraph,
  Button,
  Card,
  CardContent,
  Badge,
} from "@/components/ui";
import { ReviewModal, ReviewList, ReviewStats } from "@/components/shared";
import { bookingApi } from "@/lib/api";
import { useVehicleMetadata, useVehicleInfo } from "@/hooks/useVehicleData";
import { Booking, Vehicle, Review, ReviewFormData } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";
import { toast } from "react-hot-toast";

export default function RenterBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ name: string; email: string; walletAddress?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      setIsLoading(true);
      try {
        const res = await bookingApi.getById(bookingId);
        if (res.success && res.data) {
          setBooking(res.data);

          // Backend populates car as a full Vehicle object
          if (typeof res.data.car === "object") {
            setVehicle(res.data.car as unknown as Vehicle);
          }

          // Backend populates owner with name, email, walletAddress
          if (typeof res.data.owner === "object") {
            setOwnerInfo(res.data.owner as unknown as { name: string; email: string; walletAddress?: string });
          }
        } else {
          toast.error("Booking not found");
        }
      } catch (error) {
        console.error("Failed to load booking:", error);
        toast.error("Failed to load booking details");
      } finally {
        setIsLoading(false);
      }
    };

    loadBooking();
  }, [bookingId]);

  const handleCancelBooking = async () => {
    try {
      const res = await bookingApi.changeStatus(bookingId, "cancelled");
      if (res.success) {
        toast.success("Booking cancelled successfully!");
        setBooking((prev) => (prev ? { ...prev, status: "cancelled" as any } : null));
      } else {
        toast.error("Failed to cancel booking");
      }
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  const handleContactRentor = () => {
    toast("Contact rentor feature coming soon!", {
      icon: "📧",
      duration: 3000,
    });
  };

  const handleLeaveReview = () => {
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = (formData: ReviewFormData) => {
    // Create new review (local only for now)
    const newReview: Review = {
      _id: `review-${Date.now()}`,
      booking: bookingId,
      vehicle: vehicle?._id || "",
      renter: "current-user",
      rentor: booking?.owner as string || "",
      rating: formData.rating,
      comment: formData.comment,
      vehicleCondition: formData.vehicleCondition,
      cleanliness: formData.cleanliness,
      communication: formData.communication,
      wouldRecommend: formData.wouldRecommend,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setReviews((prev) => [newReview, ...prev]);
    setHasUserReviewed(true);
  };

  const handleDownloadReceipt = () => {
    toast("Receipt download feature coming soon!", {
      icon: "📄",
      duration: 3000,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-96 bg-gray-200 rounded-lg" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Heading as="h2" className="mb-4">
            Booking Not Found
          </Heading>
          <Paragraph className="mb-6">
            This booking doesn't exist or has been removed.
          </Paragraph>
          <Button onClick={() => router.push("/renter/bookings")}>
            Back to My Bookings
          </Button>
        </Card>
      </div>
    );
  }

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
  const canCancel = (booking.status === "pending" || booking.status === "confirmed") && !isPast;

  const duration = Math.ceil(
    (new Date(booking.returnDate).getTime() - new Date(booking.pickupDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const dailyRate = vehicle ? vehicle.pricePerDay : booking.price / duration;

  // Build timeline from real data
  const createdAt = new Date(booking.createdAt);
  const timeline = [
    {
      status: "Booking Requested",
      date: createdAt,
      description: "You submitted a booking request",
    },
    ...(booking.status !== "pending"
      ? [
          {
            status: booking.status === "cancelled" ? "Booking Cancelled" : "Booking Confirmed",
            date: new Date(booking.updatedAt),
            description:
              booking.status === "cancelled"
                ? "Your booking was cancelled"
                : "Vehicle owner approved your booking",
          },
        ]
      : []),
    ...(booking.status === "confirmed" || booking.status === "active" || booking.status === "completed"
      ? [
          {
            status: "Payment Processed",
            date: new Date(booking.updatedAt),
            description: `Payment of ${formatCurrency(booking.price)} confirmed`,
          },
        ]
      : []),
    ...(booking.status === "completed"
      ? [
          {
            status: "Vehicle Picked Up",
            date: new Date(booking.pickupDate),
            description: "You picked up the vehicle",
          },
          {
            status: "Vehicle Returned",
            date: new Date(booking.returnDate),
            description: "You returned the vehicle",
          },
        ]
      : []),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/renter/bookings")}
        className="mb-6"
      >
        ← Back to My Bookings
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle & Booking Overview */}
          <Card className="overflow-hidden">
            {vehicle && (
              <div className="relative h-96">
                <Image
                  src={vehicle.image || "/assets/car_image1.png"}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                  width={800}
                  height={400}
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge variant={statusColors[booking.status]} className="shadow-lg">
                    {booking.status}
                  </Badge>
                  {isActive && (
                    <Badge variant="success" className="shadow-lg">
                      Currently Renting
                    </Badge>
                  )}
                </div>
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Heading as="h1" className="mb-2">
                    {vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : "Booking"}
                  </Heading>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    {vehicle && (
                      <>
                        <span>📍 {vehicle.location}</span>
                        <span>🚗 {vehicle.category}</span>
                        <span>⛽ {vehicle.fuel_type}</span>
                        <span>👥 {vehicle.seating_capacity} seats</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(booking.price)}
                  </p>
                  <p className="text-sm text-gray-600">Total Cost</p>
                </div>
              </div>
              {vehicle && <Paragraph className="text-lg">{vehicle.description}</Paragraph>}
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Booking Details
              </Heading>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Pickup Date & Time</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatDate(booking.pickupDate)}
                  </p>
                  {vehicle && <p className="text-sm text-gray-600 mt-1">{vehicle.location}</p>}
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Return Date & Time</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatDate(booking.returnDate)}
                  </p>
                  {vehicle && <p className="text-sm text-gray-600 mt-1">{vehicle.location}</p>}
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Rental Duration</p>
                  <p className="text-xl font-bold text-green-600">
                    {duration} {duration === 1 ? "Day" : "Days"}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Daily Rate</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(dailyRate)}
                  </p>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="border-t pt-4">
                <Heading as="h3" className="mb-3">
                  Payment Summary
                </Heading>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {formatCurrency(dailyRate)} × {duration} {duration === 1 ? "day" : "days"}
                    </span>
                    <span className="font-semibold">{formatCurrency(dailyRate * duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Fee</span>
                    <span className="font-semibold">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-lg">{formatCurrency(booking.price)}</span>
                  </div>
                </div>
              </div>

              {booking.status === "pending" && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Pending Approval:</strong> Your booking is awaiting confirmation from
                    the vehicle owner. You'll be notified once it's approved.
                  </p>
                </div>
              )}

              {isActive && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Active Rental:</strong> You're currently renting this vehicle. Please
                    return it by {formatDate(booking.returnDate)}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Owner Information */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Vehicle Owner
              </Heading>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Name</span>
                  <span className="font-semibold">{ownerInfo?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Email</span>
                  <span className="font-semibold">{ownerInfo?.email || "N/A"}</span>
                </div>
                {ownerInfo?.walletAddress && (
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-gray-600">Wallet Address</span>
                    <span className="font-mono text-sm">
                      {ownerInfo.walletAddress.slice(0, 6)}...{ownerInfo.walletAddress.slice(-4)}
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={handleContactRentor}
              >
                📧 Contact Owner
              </Button>
            </CardContent>
          </Card>

          {/* Vehicle Condition (On-Chain) */}
          {vehicle?.vehicleNftId && (
            <VehicleConditionCard vehicleNftId={BigInt(vehicle.vehicleNftId)} />
          )}

          {/* Booking Timeline */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Booking Timeline
              </Heading>

              <div className="space-y-4">
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                      {idx < timeline.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-300 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-gray-900">{item.status}</p>
                      <p className="text-sm text-gray-600">
                        {item.date.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Actions */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Booking Actions
              </Heading>

              {/* Status */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Booking Status</span>
                  <Badge variant={statusColors[booking.status]}>
                    {booking.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Booking ID</span>
                  <span className="font-mono text-sm">{booking._id.slice(-8)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {canCancel && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleCancelBooking}
                  >
                    ✗ Cancel Booking
                  </Button>
                )}

                {booking.status === "completed" && !hasUserReviewed && (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleLeaveReview}
                  >
                    ⭐ Leave Review
                  </Button>
                )}

                {booking.status === "completed" && hasUserReviewed && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    ✓ Review Submitted
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleContactRentor}
                >
                  📧 Contact Owner
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDownloadReceipt}
                >
                  📄 Download Receipt
                </Button>

                {vehicle && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/renter/vehicle/${vehicle._id}`)}
                  >
                    🚗 View Vehicle
                  </Button>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  <strong>Booking #{booking._id.slice(-8)}:</strong> {duration}-day rental
                  for {formatCurrency(booking.price)}.
                </p>
              </div>

              {booking.status === "completed" && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-800">
                    <strong>Completed:</strong> Thank you for renting with us! Please leave
                    a review to help other renters.
                  </p>
                </div>
              )}

              {canCancel && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs text-yellow-800">
                    <strong>Cancellation Policy:</strong> Free cancellation up to 24 hours
                    before pickup.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews Section */}
      {vehicle && booking.status === "completed" && (
        <div className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Heading as="h2" className="mb-4">
                Reviews
              </Heading>
              <ReviewList reviews={reviews} />
            </div>
            <div className="lg:col-span-1">
              <ReviewStats reviews={reviews} />
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {vehicle && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSubmit={handleReviewSubmit}
          vehicleName={`${vehicle.brand} ${vehicle.model}`}
        />
      )}
    </div>
  );
}

function VehicleConditionCard({ vehicleNftId }: { vehicleNftId: bigint }) {
  const metadata = useVehicleMetadata(vehicleNftId);
  const vehicleInfo = useVehicleInfo(vehicleNftId);

  const meta = metadata.data as
    | [string, string, string, bigint, string, bigint, bigint, bigint]
    | undefined;
  const mileage = meta?.[5];
  const registrationExpiry = meta?.[6];
  const insuranceExpiry = meta?.[7];

  const info = vehicleInfo.data as [any, number, bigint, bigint, bigint] | undefined;
  const maintenanceCount = info?.[3];
  const incidentCount = info?.[4];

  const now = BigInt(Math.floor(Date.now() / 1000));
  const regValid = registrationExpiry ? registrationExpiry >= now : false;
  const insValid = insuranceExpiry ? insuranceExpiry >= now : false;

  if (metadata.isLoading || vehicleInfo.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!meta) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <Heading as="h2" className="mb-4">Vehicle Condition</Heading>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Mileage</p>
            <p className="text-xl font-bold text-blue-600">{mileage?.toString() ?? "—"}</p>
            <p className="text-xs text-gray-400">km</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Maintenance</p>
            <p className="text-xl font-bold text-green-600">{maintenanceCount?.toString() ?? "0"}</p>
            <p className="text-xs text-gray-400">records</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Incidents</p>
            <p className={`text-xl font-bold ${incidentCount && incidentCount > BigInt(0) ? "text-red-600" : "text-green-600"}`}>
              {incidentCount?.toString() ?? "0"}
            </p>
            <p className="text-xs text-gray-400">reported</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Registration</span>
            <Badge variant={regValid ? "success" : "error"}>
              {regValid ? "Valid" : registrationExpiry ? "Expired" : "Unknown"}
            </Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Insurance</span>
            <Badge variant={insValid ? "success" : "error"}>
              {insValid ? "Valid" : insuranceExpiry ? "Expired" : "Unknown"}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Verified on-chain via VehicleNFT
        </p>
      </CardContent>
    </Card>
  );
}
