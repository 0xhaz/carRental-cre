"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Input, Badge, Separator } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useBookingDetails,
  useBookingStatus,
  useIsBookingOverdue,
  useStartRental,
  useCompleteRental,
  usePerformHandover,
  useProcessReturn,
  useCalculateOverdueCharges,
  useCancelRental,
  useTotalVehicleRevenue,
  useVehicleRevenueRecords,
  useRentalPaymentDetails,
  usePaymentByBooking,
} from "@/hooks/useRentalOperations";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";

const BOOKING_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Confirmed",
  2: "Active",
  3: "Completed",
  4: "Cancelled",
};

interface BookingOperationsPanelProps {
  bookingId?: bigint;
  vehicleId?: bigint;
}

export default function BookingOperationsPanel({ bookingId, vehicleId }: BookingOperationsPanelProps) {
  const [lookupId, setLookupId] = useState(bookingId?.toString() || "");
  const [activeBookingId, setActiveBookingId] = useState<bigint | undefined>(bookingId);

  // Handover/return form
  const [mileage, setMileage] = useState("");
  const [fuelLevel, setFuelLevel] = useState("");
  const [damageNotes, setDamageNotes] = useState("");

  const { data: booking } = useBookingDetails(activeBookingId);
  const { data: status } = useBookingStatus(activeBookingId);
  const { data: isOverdue } = useIsBookingOverdue(activeBookingId);
  const { data: paymentId } = usePaymentByBooking(activeBookingId);
  const { data: paymentDetails } = useRentalPaymentDetails(paymentId as bigint | undefined);
  const overdueChargesWrite = useCalculateOverdueCharges();
  const { formatted: vehicleRevenue } = useTotalVehicleRevenue(vehicleId);

  const startRental = useStartRental();
  const completeRental = useCompleteRental();
  const handover = usePerformHandover();
  const processReturn = useProcessReturn();
  const cancelRental = useCancelRental();

  useEffect(() => { if (startRental.isSuccess) toast.success("Rental started!"); }, [startRental.isSuccess]);
  useEffect(() => { if (completeRental.isSuccess) toast.success("Rental completed!"); }, [completeRental.isSuccess]);
  useEffect(() => { if (handover.isSuccess) toast.success("Handover complete!"); }, [handover.isSuccess]);
  useEffect(() => { if (processReturn.isSuccess) toast.success("Return processed!"); }, [processReturn.isSuccess]);
  useEffect(() => { if (cancelRental.isSuccess) toast.success("Rental cancelled"); }, [cancelRental.isSuccess]);

  const statusNum = status !== undefined ? Number(status) : undefined;
  const bookingData = booking as any;

  const handleSearch = () => {
    if (lookupId) setActiveBookingId(BigInt(lookupId));
  };

  return (
    <div className="space-y-6">
      {/* Lookup */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-3">Booking Operations</Heading>
          <div className="flex gap-3">
            <Input type="number" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Booking ID" className="flex-1" />
            <Button onClick={handleSearch} disabled={!lookupId}>Look Up</Button>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details */}
      {activeBookingId !== undefined && bookingData && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading as="h4" className="text-sm">Booking #{Number(activeBookingId)}</Heading>
              <div className="flex gap-2">
                {Boolean(isOverdue) && <Badge variant="error">Overdue</Badge>}
                {statusNum !== undefined && (
                  <Badge variant={statusNum === 2 ? "info" : statusNum === 3 ? "success" : statusNum === 4 ? "error" : "warning"}>
                    {BOOKING_STATUS_LABELS[statusNum] || `Status ${statusNum}`}
                  </Badge>
                )}
              </div>
            </div>

            {/* Overdue charges */}
            {Boolean(isOverdue) && (
              <div className="bg-red-50 p-3 rounded-lg mb-4">
                <p className="text-xs text-red-600">This booking is overdue.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => overdueChargesWrite.calculateOverdueCharges(activeBookingId!)}
                  disabled={overdueChargesWrite.isPending || overdueChargesWrite.isConfirming}
                  className="mt-2"
                >
                  {overdueChargesWrite.isPending ? "Confirm..." : "Calculate Overdue Charges"}
                </Button>
                {overdueChargesWrite.hash && <ExplorerLink value={overdueChargesWrite.hash} type="tx" label="View tx" className="text-xs mt-1" />}
              </div>
            )}

            {/* Vehicle revenue */}
            {vehicleId !== undefined && parseFloat(vehicleRevenue) > 0 && (
              <div className="bg-green-50 p-3 rounded-lg mb-4">
                <p className="text-xs text-green-600">Total vehicle revenue: <strong>{vehicleRevenue} ETH</strong></p>
              </div>
            )}

            {/* State-based actions */}
            <div className="space-y-4">
              {/* Pending → Start */}
              {statusNum === 0 && (
                <Button onClick={() => startRental.startRental(activeBookingId)} disabled={startRental.isPending || startRental.isConfirming} className="w-full">
                  {startRental.isPending ? "Confirm..." : startRental.isConfirming ? "Starting..." : "Start Rental"}
                </Button>
              )}

              {/* Confirmed → Handover */}
              {statusNum === 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Perform Handover</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" label="Mileage" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="50000" />
                    <Input type="number" label="Fuel Level (%)" value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)} placeholder="100" />
                  </div>
                  <Input label="Damage Notes" value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="No pre-existing damage" />
                  <Button
                    onClick={() => handover.performHandover(activeBookingId!, {
                      mileage: BigInt(mileage || "0"),
                      fuelLevel: parseInt(fuelLevel || "100"),
                      photoHashes: [],
                      damageNotes: damageNotes ? [damageNotes] : [],
                    })}
                    disabled={handover.isPending || handover.isConfirming}
                    className="w-full"
                  >
                    {handover.isPending ? "Confirm..." : "Perform Handover"}
                  </Button>
                </div>
              )}

              {/* Active → Return / Complete */}
              {statusNum === 2 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Process Return</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" label="Return Mileage" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="51000" />
                    <Input type="number" label="Fuel Level (%)" value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)} placeholder="80" />
                  </div>
                  <Input label="Damage Notes" value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="Minor scratch..." />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => processReturn.processReturn(activeBookingId!, {
                        mileage: BigInt(mileage || "0"),
                        fuelLevel: parseInt(fuelLevel || "100"),
                        photoHashes: [],
                        damageNotes: damageNotes ? [damageNotes] : [],
                      })}
                      disabled={processReturn.isPending || processReturn.isConfirming}
                      className="flex-1"
                    >
                      {processReturn.isPending ? "Confirm..." : "Process Return"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => completeRental.completeRental(activeBookingId!, BigInt(0), 0, "Normal completion")}
                      disabled={completeRental.isPending || completeRental.isConfirming}
                      className="flex-1"
                    >
                      {completeRental.isPending ? "Confirm..." : "Complete Rental"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancel (available for pending/confirmed) */}
              {(statusNum === 0 || statusNum === 1) && (
                <>
                  <Separator className="my-2" />
                  <Button
                    variant="outline"
                    onClick={() => cancelRental.cancelRental(activeBookingId)}
                    disabled={cancelRental.isPending || cancelRental.isConfirming}
                    className="w-full"
                  >
                    {cancelRental.isPending ? "Confirm..." : "Cancel Rental"}
                  </Button>
                </>
              )}

              {/* Tx links */}
              {[startRental, completeRental, handover, processReturn, cancelRental].map((h, i) =>
                h.hash ? <ExplorerLink key={i} value={h.hash} type="tx" label="View tx" className="text-xs" /> : null
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
