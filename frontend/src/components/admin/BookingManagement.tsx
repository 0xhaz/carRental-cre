"use client";

import { useState } from "react";
import { Card, CardContent, Heading, Paragraph, Badge, Button, Input } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useVehicleBookings,
  useBookingDetails,
  useApproveBooking,
  useRejectBooking,
  useIsBookingOverdue,
} from "@/hooks/useRentalOperations";
import { useIsRenterBlacklisted } from "@/hooks/useCompliance";
import { useWatchOnboardingReports } from "@/hooks/useCRE";
import { OnboardingAction, type OnboardingReportEvent } from "@/types/cre";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";
import { BOOKING_STATUS } from "@/constants";

const BOOKING_STATUS_LABELS: Record<number, string> = {
  0: "Requested",
  1: "Pending Approval",
  2: "Approved",
  3: "Active",
  4: "Pending Return",
  5: "Completed",
  6: "Cancelled",
  7: "Disputed",
};

const BOOKING_STATUS_VARIANTS: Record<number, "info" | "warning" | "success" | "error"> = {
  0: "info",
  1: "warning",
  2: "success",
  3: "info",
  4: "warning",
  5: "success",
  6: "error",
  7: "error",
};

function BookingRow({ bookingId }: { bookingId: bigint }) {
  const { data: booking } = useBookingDetails(bookingId);
  const { data: overdueData } = useIsBookingOverdue(bookingId);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const approve = useApproveBooking();
  const reject = useRejectBooking();

  // Extract renter address from booking data for compliance check
  const renterAddr = (booking as any)?.renter as `0x${string}` | undefined;
  const { data: isBlacklisted } = useIsRenterBlacklisted(renterAddr);

  if (!booking) {
    return (
      <tr>
        <td colSpan={6} className="py-3 px-4">
          <div className="h-8 bg-gray-100 rounded animate-pulse" />
        </td>
      </tr>
    );
  }

  const b = booking as {
    id: bigint;
    vehicleId: bigint;
    renter: string;
    startTime: bigint;
    endTime: bigint;
    ratePerDay: bigint;
    securityDeposit: bigint;
    status: number;
    paymentId: bigint;
    extensionCount: bigint;
    overdueMinutes: bigint;
    damageCharges: bigint;
    cancellationReason: string;
  };

  const status = Number(b.status);
  const startDate = new Date(Number(b.startTime) * 1000);
  const endDate = new Date(Number(b.endTime) * 1000);
  const isOverdue = overdueData ? (overdueData as [boolean, bigint])[0] : false;
  const canApprove = status === 0 || status === 1;

  const handleApprove = () => {
    approve.approveBooking(bookingId);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    reject.rejectBooking(bookingId, rejectReason);
  };

  if (approve.isSuccess) toast.success(`Booking #${bookingId} approved`);
  if (reject.isSuccess) toast.success(`Booking #${bookingId} rejected`);

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="py-3 px-4 font-mono text-sm">#{Number(bookingId)}</td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            <ExplorerLink value={b.renter} type="address" />
            {isBlacklisted === true && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700" title="Renter is blacklisted in RenterCompliance">
                Blacklisted
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-sm">
          <div>{startDate.toLocaleDateString()}</div>
          <div className="text-gray-500">{endDate.toLocaleDateString()}</div>
        </td>
        <td className="py-3 px-4 text-sm font-mono">
          {formatEther(b.ratePerDay)} ETH/day
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1">
            <Badge variant={BOOKING_STATUS_VARIANTS[status] || "info"}>
              {BOOKING_STATUS_LABELS[status] || `Status ${status}`}
            </Badge>
            {isOverdue && (
              <Badge variant="error">Overdue</Badge>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          {canApprove && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={approve.isPending || approve.isConfirming}
              >
                {approve.isPending || approve.isConfirming ? "..." : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectInput(!showRejectInput)}
              >
                Reject
              </Button>
            </div>
          )}
          {approve.hash && (
            <div className="text-xs mt-1">
              <ExplorerLink value={approve.hash} type="tx" label="View tx" />
            </div>
          )}
        </td>
      </tr>
      {showRejectInput && canApprove && (
        <tr className="bg-red-50">
          <td colSpan={6} className="py-2 px-4">
            <div className="flex items-center gap-2">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason..."
                className="flex-1"
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={reject.isPending || reject.isConfirming}
              >
                {reject.isPending || reject.isConfirming ? "..." : "Confirm Reject"}
              </Button>
            </div>
            {reject.error && (
              <p className="text-xs text-red-600 mt-1">
                {(reject.error as Error).message?.slice(0, 80)}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function BookingManagement() {
  const [vehicleIdInput, setVehicleIdInput] = useState("");
  const [searchVehicleId, setSearchVehicleId] = useState<bigint | undefined>();

  const { data: bookingIds, isLoading } = useVehicleBookings(searchVehicleId);
  const ids = (bookingIds as bigint[]) || [];

  // Watch for CRE booking auto-approvals/rejections
  const onboardingEvents = useWatchOnboardingReports();
  const bookingCREEvents = onboardingEvents.filter(
    (e) =>
      e.action === OnboardingAction.APPROVE_BOOKING ||
      e.action === OnboardingAction.REJECT_BOOKING,
  );

  const handleSearch = () => {
    if (!vehicleIdInput.trim()) return;
    setSearchVehicleId(BigInt(vehicleIdInput));
  };

  return (
    <div className="space-y-6">
      {/* CRE Auto-Processing Indicator */}
      {bookingCREEvents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-blue-800">
            <strong>{bookingCREEvents.length}</strong> booking{bookingCREEvents.length !== 1 ? "s" : ""} auto-processed by Chainlink CRE this session
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse ml-auto" />
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-3">
            Look Up Bookings
          </Heading>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={vehicleIdInput}
              onChange={(e) => setVehicleIdInput(e.target.value)}
              placeholder="Vehicle NFT ID"
              className="max-w-xs"
            />
            <Button onClick={handleSearch} disabled={!vehicleIdInput.trim()}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchVehicleId !== undefined && (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-gray-200">
              <Heading as="h3">
                Bookings for Vehicle #{Number(searchVehicleId)}
              </Heading>
              <Paragraph className="text-sm text-gray-500">
                {ids.length} booking(s) found
              </Paragraph>
            </div>

            {isLoading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ) : ids.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No bookings found for this vehicle
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Renter</th>
                      <th className="py-3 px-4">Dates</th>
                      <th className="py-3 px-4">Rate</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ids.map((id) => (
                      <BookingRow key={id.toString()} bookingId={id} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
