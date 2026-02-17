"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookingCard, BookingCardSkeleton } from "@/components/renter";
import { Heading, Paragraph, Button } from "@/components/ui";
import { bookingApi } from "@/lib/api";
import { Booking, Vehicle } from "@/types";
import { toast } from "react-hot-toast";

export default function RenterBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "past">("all");

  useEffect(() => {
    const loadBookings = async () => {
      setIsLoading(true);
      try {
        const res = await bookingApi.getUserBookings();
        if (res.success) {
          setBookings(res.data);
        } else {
          toast.error("Failed to load bookings");
        }
      } catch (error) {
        console.error("Failed to load bookings:", error);
        toast.error("Failed to load bookings");
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await bookingApi.changeStatus(bookingId, "cancelled");
      if (res.success) {
        toast.success("Booking cancelled successfully");
        setBookings(bookings.filter((b) => b._id !== bookingId));
      } else {
        toast.error("Failed to cancel booking");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("Failed to cancel booking");
    }
  };

  const handleLeaveReview = (bookingId: string) => {
    router.push(`/renter/booking/${bookingId}`);
  };

  // Filter bookings
  const now = new Date();
  const filteredBookings = bookings.filter((booking) => {
    const returnDate = new Date(booking.returnDate);

    if (filter === "active") {
      return returnDate >= now && booking.status !== "cancelled" && booking.status !== "completed";
    } else if (filter === "past") {
      return returnDate < now || booking.status === "completed";
    }
    return true; // all
  });

  const activeCount = bookings.filter(
    (b) => new Date(b.returnDate) >= now && b.status !== "cancelled" && b.status !== "completed"
  ).length;

  const pastCount = bookings.filter(
    (b) => new Date(b.returnDate) < now || b.status === "completed"
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          My Bookings
        </Heading>
        <Paragraph className="text-lg">
          View and manage your car rental bookings
        </Paragraph>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All Bookings ({bookings.length})
        </Button>
        <Button
          variant={filter === "active" ? "default" : "outline"}
          onClick={() => setFilter("active")}
        >
          Active ({activeCount})
        </Button>
        <Button
          variant={filter === "past" ? "default" : "outline"}
          onClick={() => setFilter("past")}
        >
          Past ({pastCount})
        </Button>
      </div>

      {/* Bookings List */}
      <div className="mb-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              // Backend populates car as a full Vehicle object
              const vehicle = typeof booking.car === "object"
                ? (booking.car as unknown as Vehicle)
                : undefined;
              return (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  vehicle={vehicle}
                  onCancel={handleCancelBooking}
                  onLeaveReview={handleLeaveReview}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Paragraph className="text-lg text-gray-600">
              {filter === "all"
                ? "You don't have any bookings yet."
                : filter === "active"
                ? "No active bookings."
                : "No past bookings."}
            </Paragraph>
            <Paragraph className="mt-2 text-sm text-gray-500">
              {filter === "all" && "Browse vehicles to make your first booking."}
            </Paragraph>
          </div>
        )}
      </div>
    </div>
  );
}
