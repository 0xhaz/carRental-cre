"use client";

import { useState, useEffect } from "react";
import { BookingCard, BookingCardSkeleton } from "@/src/components/renter";
import { Heading, Paragraph, Button, Badge } from "@/src/components/ui";
import { generateMockBookings, generateMockVehicles } from "@/src/lib/mockData";
import { Booking, Vehicle } from "@/src/types";
import { formatCurrency } from "@/src/lib/utils";
import { toast } from "react-hot-toast";

export default function RentorBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "completed">("all");

  useEffect(() => {
    const loadBookings = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockBookings = generateMockBookings(15);
      const mockVehicles = generateMockVehicles(12);

      setBookings(mockBookings);
      setVehicles(mockVehicles);
      setIsLoading(false);
    };

    loadBookings();
  }, []);

  const handleApproveBooking = (bookingId: string) => {
    toast.success("Booking approved successfully");
    setBookings(
      bookings.map((b) =>
        b._id === bookingId ? { ...b, status: "confirmed" as any } : b
      )
    );
  };

  const handleRejectBooking = (bookingId: string) => {
    toast.success("Booking rejected");
    setBookings(
      bookings.map((b) =>
        b._id === bookingId ? { ...b, status: "cancelled" as any } : b
      )
    );
  };

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true;
    return booking.status === filter;
  });

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const activeCount = bookings.filter((b) => b.status === "active" || b.status === "confirmed").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  // Calculate revenue
  const totalRevenue = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.price, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Bookings Management
        </Heading>
        <Paragraph className="text-lg">
          View and manage all bookings for your vehicles
        </Paragraph>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-borderColor p-4">
          <p className="text-sm text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <p className="text-sm text-gray-600">Pending Approval</p>
          <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All ({bookings.length})
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pending ({pendingCount})
        </Button>
        <Button
          variant={filter === "active" ? "default" : "outline"}
          onClick={() => setFilter("active")}
        >
          Active ({activeCount})
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          onClick={() => setFilter("completed")}
        >
          Completed ({completedCount})
        </Button>
      </div>

      {/* Bookings List */}
      <div className="mb-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const vehicle = vehicles.find((v) => v._id === booking.car);
              return (
                <div key={booking._id} className="relative">
                  <BookingCard booking={booking} vehicle={vehicle} basePath="rentor" />
                  {booking.status === "pending" && (
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApproveBooking(booking._id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectBooking(booking._id)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Paragraph className="text-lg text-gray-600">
              No {filter !== "all" ? filter : ""} bookings found.
            </Paragraph>
          </div>
        )}
      </div>
    </div>
  );
}
