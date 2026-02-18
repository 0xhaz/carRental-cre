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
import { bookingApi } from "@/lib/api";
import { Booking, Vehicle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";
import { toast } from "react-hot-toast";

export default function RentorBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [renterInfo, setRenterInfo] = useState<{ name: string; email: string; walletAddress?: string } | null>(null);
  const [renterProfile, setRenterProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

          // Backend populates user with name, email, walletAddress
          if (typeof res.data.user === "object") {
            setRenterInfo(res.data.user as unknown as { name: string; email: string; walletAddress?: string });
          }

          // Backend populates renterProfile if available
          if ((res.data as any).renterProfile) {
            setRenterProfile((res.data as any).renterProfile);
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

  const handleApprove = async () => {
    try {
      const res = await bookingApi.changeStatus(bookingId, "confirmed");
      if (res.success) {
        toast.success("Booking approved successfully!");
        setBooking((prev) => (prev ? { ...prev, status: "confirmed" as any } : null));
      } else {
        toast.error("Failed to approve booking");
      }
    } catch (error) {
      toast.error("Failed to approve booking");
    }
  };

  const handleReject = async () => {
    try {
      const res = await bookingApi.changeStatus(bookingId, "cancelled");
      if (res.success) {
        toast.success("Booking rejected");
        setBooking((prev) => (prev ? { ...prev, status: "cancelled" as any } : null));
      } else {
        toast.error("Failed to reject booking");
      }
    } catch (error) {
      toast.error("Failed to reject booking");
    }
  };

  const handleMarkComplete = async () => {
    try {
      const res = await bookingApi.changeStatus(bookingId, "completed");
      if (res.success) {
        toast.success("Booking marked as completed!");
        setBooking((prev) => (prev ? { ...prev, status: "completed" as any } : null));
      } else {
        toast.error("Failed to complete booking");
      }
    } catch (error) {
      toast.error("Failed to complete booking");
    }
  };

  const handleContactRenter = () => {
    toast("Contact renter feature coming soon!", {
      icon: "📧",
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
          <Button onClick={() => router.push("/rentor/bookings")}>
            Back to Bookings
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

  const duration = Math.ceil(
    (new Date(booking.returnDate).getTime() - new Date(booking.pickupDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Build timeline from real data
  const createdAt = new Date(booking.createdAt);
  const timeline = [
    {
      status: "Booking Created",
      date: createdAt,
      description: "Renter submitted booking request",
    },
    ...(booking.status !== "pending"
      ? [
          {
            status: booking.status === "cancelled" ? "Booking Rejected" : "Booking Confirmed",
            date: new Date(booking.updatedAt),
            description:
              booking.status === "cancelled"
                ? "Booking request was rejected"
                : "You approved this booking",
          },
        ]
      : []),
    ...(booking.status === "completed"
      ? [
          {
            status: "Vehicle Picked Up",
            date: new Date(booking.pickupDate),
            description: "Renter picked up the vehicle",
          },
          {
            status: "Vehicle Returned",
            date: new Date(booking.returnDate),
            description: "Vehicle returned successfully",
          },
        ]
      : []),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/rentor/bookings")}
        className="mb-6"
      >
        ← Back to Bookings
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
                      Active Rental
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
                      </>
                    )}
                    <span>💼 Booking ID: {booking._id.slice(-8)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(booking.price)}
                  </p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
              </div>
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
                    {vehicle ? formatCurrency(vehicle.pricePerDay) : "N/A"}
                  </p>
                </div>
              </div>

              {booking.status === "pending" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Action Required:</strong> This booking is pending your approval.
                    Review the details and approve or reject the request.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Renter Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Heading as="h2">Renter Information</Heading>
                {renterProfile?.isVerified && (
                  <Badge variant="success">KYC Verified</Badge>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Name</span>
                  <span className="font-semibold">
                    {renterProfile?.personalInfo?.fullName || renterInfo?.name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Email</span>
                  <span className="font-semibold">
                    {renterProfile?.personalInfo?.email || renterInfo?.email || "N/A"}
                  </span>
                </div>
                {(renterProfile?.personalInfo?.phone) && (
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-gray-600">Phone</span>
                    <span className="font-semibold">{renterProfile.personalInfo.phone}</span>
                  </div>
                )}
                {renterProfile?.driverLicense?.number && (
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-gray-600">Driver&apos;s License</span>
                    <div className="text-right">
                      <span className="font-semibold">{renterProfile.driverLicense.number}</span>
                      {renterProfile.driverLicense.isVerified && (
                        <span className="ml-2 text-xs text-green-600 font-medium">Verified</span>
                      )}
                      {renterProfile.driverLicense.expiryDate && (
                        <p className="text-xs text-gray-500">
                          Exp: {formatDate(renterProfile.driverLicense.expiryDate)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {renterProfile?.address?.street && (
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-gray-600">Address</span>
                    <span className="font-semibold text-right text-sm">
                      {renterProfile.address.street}, {renterProfile.address.city},{" "}
                      {renterProfile.address.state} {renterProfile.address.zipCode}
                    </span>
                  </div>
                )}
                {renterInfo?.walletAddress && (
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-gray-600">Wallet Address</span>
                    <span className="font-mono text-sm">
                      {renterInfo.walletAddress.slice(0, 6)}...{renterInfo.walletAddress.slice(-4)}
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={handleContactRenter}
              >
                📧 Contact Renter
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
                  <span className="text-gray-600">Status</span>
                  <Badge variant={statusColors[booking.status]}>
                    {booking.status}
                  </Badge>
                </div>
                {isActive && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Status</span>
                    <Badge variant="success">Active Rental</Badge>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {booking.status === "pending" && (
                  <>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleApprove}
                    >
                      ✓ Approve Booking
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleReject}
                    >
                      ✗ Reject Booking
                    </Button>
                  </>
                )}

                {(booking.status === "confirmed" || booking.status === "active") &&
                  isPast && (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleMarkComplete}
                    >
                      ✓ Mark as Completed
                    </Button>
                  )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleContactRenter}
                >
                  📧 Contact Renter
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => vehicle && router.push(`/rentor/vehicle/${vehicle._id}`)}
                  disabled={!vehicle}
                >
                  🚗 View Vehicle
                </Button>
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  <strong>Booking #{booking._id.slice(-8)}:</strong> {duration}-day rental
                  generating {formatCurrency(booking.price)} in revenue.
                </p>
              </div>

              {booking.status === "completed" && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-800">
                    <strong>Completed:</strong> Payment has been processed and revenue
                    distributed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
