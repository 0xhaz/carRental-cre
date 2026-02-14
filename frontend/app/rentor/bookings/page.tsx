"use client";

import { useState, useEffect } from "react";
import { BookingCard, BookingCardSkeleton } from "@/components/renter";
import { Heading, Paragraph, Button, Badge } from "@/components/ui";
import { Booking } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { bookingApi } from "@/lib/api";

export default function RentorBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "completed">("all");

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const response = await bookingApi.getRentorBookings();

      if (response.success) {
        setBookings(response.data || []);
      }
    } catch (error: any) {
      console.error("Failed to load bookings:", error);
      toast.error(error.response?.data?.message || "Failed to load bookings");
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleApproveBooking = async (bookingId: string) => {
    try {
      const response = await bookingApi.changeStatus(bookingId, "confirmed");

      if (response.success) {
        toast.success("Booking approved successfully");
        loadBookings(); // Reload bookings
      }
    } catch (error: any) {
      console.error("Failed to approve booking:", error);
      toast.error(error.response?.data?.message || "Failed to approve booking");
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      const response = await bookingApi.changeStatus(bookingId, "cancelled");

      if (response.success) {
        toast.success("Booking rejected");
        loadBookings(); // Reload bookings
      }
    } catch (error: any) {
      console.error("Failed to reject booking:", error);
      toast.error(error.response?.data?.message || "Failed to reject booking");
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true;
    if (filter === "active") return booking.status === "active" || booking.status === "confirmed";
    return booking.status === filter;
  });

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const activeCount = bookings.filter((b) => b.status === "active" || b.status === "confirmed").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  // Calculate revenue from completed bookings
  const totalRevenue = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.price || 0), 0);

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
            {filteredBookings.map((booking) => (
              <div key={booking._id} className="relative">
                <BookingCard
                  booking={booking}
                  vehicle={typeof booking.car === "object" ? booking.car : undefined}
                  basePath="rentor"
                />
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
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Paragraph className="text-lg text-gray-600">
              No {filter !== "all" ? filter : ""} bookings found.
            </Paragraph>
            {filter === "all" && bookings.length === 0 && (
              <Paragraph className="mt-2 text-sm text-gray-500">
                Your vehicles haven't received any bookings yet.
              </Paragraph>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
