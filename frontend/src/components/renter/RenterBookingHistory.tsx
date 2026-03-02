"use client";

import { useState } from "react";
import { Card, CardContent, Heading, Badge } from "@/components/ui";
import {
  useMyRenterBookings,
  useBookingDetails,
  useBookingStatus,
  useIsBookingOverdue,
  useMyRenterPayments,
  useRentalPaymentDetails,
  useMileageDriven,
  useBookingDamageAssessments,
} from "@/hooks/useRentalOperations";
import { formatEther } from "viem";

const BOOKING_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Confirmed",
  2: "Active",
  3: "Completed",
  4: "Cancelled",
};

function BookingRow({ bookingId }: { bookingId: bigint }) {
  const [expanded, setExpanded] = useState(false);
  const { data: booking } = useBookingDetails(bookingId);
  const { data: status } = useBookingStatus(bookingId);
  const { data: isOverdue } = useIsBookingOverdue(bookingId);
  const { data: mileage } = useMileageDriven(bookingId);
  const { data: damages } = useBookingDamageAssessments(bookingId);

  const statusNum = status !== undefined ? Number(status) : undefined;
  const b = booking as any;

  return (
    <Card>
      <CardContent className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold">Booking #{Number(bookingId)}</p>
            {statusNum !== undefined && (
              <Badge variant={statusNum === 2 ? "info" : statusNum === 3 ? "success" : statusNum === 4 ? "error" : "warning"}>
                {BOOKING_STATUS_LABELS[statusNum] || `Status ${statusNum}`}
              </Badge>
            )}
            {Boolean(isOverdue) && <Badge variant="error">Overdue</Badge>}
          </div>
          <span className="text-gray-400 text-sm">{expanded ? "▲" : "▼"}</span>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {b && (
                <>
                  <div>
                    <span className="text-gray-500">Vehicle</span>
                    <p className="font-mono text-xs">#{b[1] ? Number(b[1]) : "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Start</span>
                    <p>{b[3] ? new Date(Number(b[3]) * 1000).toLocaleDateString() : "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">End</span>
                    <p>{b[4] ? new Date(Number(b[4]) * 1000).toLocaleDateString() : "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Cost</span>
                    <p>{b[5] ? formatEther(b[5]) : "—"} ETH</p>
                  </div>
                </>
              )}
            </div>

            {mileage !== undefined && Number(mileage) > 0 && (
              <div className="text-xs bg-blue-50 p-2 rounded">
                Mileage driven: <strong>{Number(mileage).toLocaleString()} km</strong>
              </div>
            )}

            {Boolean(damages) && (damages as any[]).length > 0 && (
              <div className="text-xs bg-red-50 p-2 rounded">
                <p className="font-medium text-red-700 mb-1">Damage Assessments:</p>
                {(damages as any[]).map((d: any, i: number) => (
                  <p key={i} className="text-red-600">{d.description || d[0] || `Assessment #${i}`}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RenterBookingHistory() {
  const { data: myBookings } = useMyRenterBookings();
  const { data: myPayments } = useMyRenterPayments();

  const bookingIds = (myBookings as bigint[]) || [];
  const paymentIds = (myPayments as bigint[]) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-2">My Rental History</Heading>
          <p className="text-sm text-gray-600">
            {bookingIds.length} booking{bookingIds.length !== 1 ? "s" : ""} | {paymentIds.length} payment{paymentIds.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {bookingIds.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-gray-500">No bookings found on-chain</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookingIds.map((id) => (
            <BookingRow key={id.toString()} bookingId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
