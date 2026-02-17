"use client";

import { Heading, Paragraph } from "@/components/ui";
import { BookingManagement } from "@/components/admin/BookingManagement";

export default function AdminBookingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Booking Management
        </Heading>
        <Paragraph className="text-lg">
          Approve, reject, and monitor vehicle bookings on-chain
        </Paragraph>
      </div>

      <BookingManagement />
    </div>
  );
}
