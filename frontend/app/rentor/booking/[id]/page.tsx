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
import { generateMockBookings, generateMockVehicles } from "@/lib/mockData";
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBooking = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find booking from mock data
      const mockBookings = generateMockBookings(20);
      const foundBooking = mockBookings.find((b) => b._id === bookingId);

      if (foundBooking) {
        setBooking(foundBooking);

        // Find associated vehicle
        const mockVehicles = generateMockVehicles(20);
        const foundVehicle = mockVehicles.find((v) => v._id === foundBooking.car);
        if (foundVehicle) {
          setVehicle(foundVehicle);
        }
      }

      setIsLoading(false);
    };

    loadBooking();
  }, [bookingId]);

  const handleApprove = () => {
    toast.success("Booking approved successfully!");
    setBooking((prev) => (prev ? { ...prev, status: "confirmed" as any } : null));
  };

  const handleReject = () => {
    toast.success("Booking rejected");
    setBooking((prev) => (prev ? { ...prev, status: "cancelled" as any } : null));
  };

  const handleMarkComplete = () => {
    toast.success("Booking marked as completed!");
    setBooking((prev) => (prev ? { ...prev, status: "completed" as any } : null));
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

  // Mock renter information
  const renter = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    walletAddress: "0x" + Math.random().toString(16).slice(2, 42),
    totalBookings: Math.floor(Math.random() * 20) + 1,
    joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
  };

  // Mock booking timeline
  const timeline = [
    {
      status: "Booking Created",
      date: new Date(booking.pickupDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      description: "Renter submitted booking request",
    },
    ...(booking.status !== "pending"
      ? [
          {
            status: booking.status === "cancelled" ? "Booking Rejected" : "Booking Confirmed",
            date: new Date(booking.pickupDate.getTime() - 5 * 24 * 60 * 60 * 1000),
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
            date: booking.pickupDate,
            description: "Renter picked up the vehicle",
          },
          {
            status: "Vehicle Returned",
            date: booking.returnDate,
            description: "Vehicle returned successfully",
          },
        ]
      : []),
  ];

  const duration = Math.ceil(
    (new Date(booking.returnDate).getTime() - new Date(booking.pickupDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

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
              <Heading as="h2" className="mb-4">
                Renter Information
              </Heading>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Name</span>
                  <span className="font-semibold">{renter.name}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Email</span>
                  <span className="font-semibold">{renter.email}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Phone</span>
                  <span className="font-semibold">{renter.phone}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Wallet Address</span>
                  <span className="font-mono text-sm">
                    {renter.walletAddress.slice(0, 6)}...{renter.walletAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-gray-600">Total Bookings</span>
                  <span className="font-semibold">{renter.totalBookings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Member Since</span>
                  <span className="font-semibold">
                    {renter.joinDate.toLocaleDateString()}
                  </span>
                </div>
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
