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
import { generateMockBookings, generateMockVehicles, generateMockReviews } from "@/lib/mockData";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find booking from mock data
      const mockBookings = generateMockBookings(20);

      // Ensure first booking is completed for easy testing
      if (mockBookings.length > 0) {
        mockBookings[0].status = "completed" as any;
        mockBookings[0].returnDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      const foundBooking = mockBookings.find((b) => b._id === bookingId);

      if (foundBooking) {
        setBooking(foundBooking);

        // Find associated vehicle
        const mockVehicles = generateMockVehicles(20);
        const foundVehicle = mockVehicles.find((v) => v._id === foundBooking.car);
        if (foundVehicle) {
          setVehicle(foundVehicle);

          // Load reviews for this vehicle
          const mockReviews = generateMockReviews(15);
          // Filter out any reviews for the current booking (to allow testing)
          const vehicleReviews = mockReviews.filter(
            (r) => r.vehicle === foundVehicle._id && r.booking !== bookingId
          );
          setReviews(vehicleReviews);

          // User hasn't reviewed yet (since we filtered out current booking)
          setHasUserReviewed(false);
        }
      }

      setIsLoading(false);
    };

    loadBooking();
  }, [bookingId]);

  const handleCancelBooking = () => {
    toast.success("Booking cancelled successfully!");
    setBooking((prev) => (prev ? { ...prev, status: "cancelled" as any } : null));
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
    // Create new review
    const newReview: Review = {
      _id: `review-${Date.now()}`,
      booking: bookingId,
      vehicle: vehicle?._id || "",
      renter: "current-user-1",
      rentor: booking?.owner || "",
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

  // Mock rentor information
  const rentor = {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "+1 (555) 987-6543",
    walletAddress: "0x" + Math.random().toString(16).slice(2, 42),
    totalVehicles: Math.floor(Math.random() * 10) + 1,
    joinDate: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000),
  };

  // Mock booking timeline
  const timeline = [
    {
      status: "Booking Requested",
      date: new Date(booking.pickupDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      description: "You submitted a booking request",
    },
    ...(booking.status !== "pending"
      ? [
          {
            status: booking.status === "cancelled" ? "Booking Cancelled" : "Booking Confirmed",
            date: new Date(booking.pickupDate.getTime() - 5 * 24 * 60 * 60 * 1000),
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
            date: new Date(booking.pickupDate.getTime() - 4 * 24 * 60 * 60 * 1000),
            description: `Payment of ${formatCurrency(booking.price)} confirmed`,
          },
        ]
      : []),
    ...(booking.status === "completed"
      ? [
          {
            status: "Vehicle Picked Up",
            date: booking.pickupDate,
            description: "You picked up the vehicle",
          },
          {
            status: "Vehicle Returned",
            date: booking.returnDate,
            description: "You returned the vehicle",
          },
        ]
      : []),
  ];

  const duration = Math.ceil(
    (new Date(booking.returnDate).getTime() - new Date(booking.pickupDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const dailyRate = vehicle ? vehicle.pricePerDay : booking.price / duration;

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
                        <span>⛽ {vehicle.fuelType}</span>
                        <span>👥 {vehicle.seatingCapacity} seats</span>
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
                  <span className="font-semibold">{rentor.name}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Email</span>
                  <span className="font-semibold">{rentor.email}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Phone</span>
                  <span className="font-semibold">{rentor.phone}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Total Vehicles</span>
                  <span className="font-semibold">{rentor.totalVehicles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Member Since</span>
                  <span className="font-semibold">
                    {rentor.joinDate.toLocaleDateString()}
                  </span>
                </div>
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
