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
  Separator,
} from "@/components/ui";
import { bookingApi } from "@/lib/api";
import { Booking, Vehicle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { keccak256, toHex, formatEther, parseEther } from "viem";
import { useAccount, useConnect } from "wagmi";
import {
  usePaymentByBooking,
  useRentalPaymentDetails,
  useStartRental,
  useCompleteRental,
} from "@/hooks/useRentalOperations";
import { useDistributeRevenue, useVehicleRevenue } from "@/hooks/useInvestment";

import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";

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

          {/* On-Chain Rental Lifecycle — only for crypto-paid bookings */}
          {((booking as any).paymentMethod === "crypto" || (booking as any).txHashes?.request) && (
            <RentalLifecycleCard bookingMongoId={booking._id} />
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// On-Chain Rental Lifecycle Card
// ═══════════════════════════════════════════════

const PAYMENT_STATES = ["PENDING", "ESCROWED", "ACTIVE", "PROCESSING", "COMPLETED", "DISPUTED", "REFUNDED", "CANCELLED"];

const PENALTY_REASONS = [
  { value: 0, label: "None" },
  { value: 1, label: "Damage" },
  { value: 2, label: "Late Return" },
  { value: 3, label: "Excessive Mileage" },
  { value: 4, label: "Cleaning Fee" },
  { value: 5, label: "Missing Fuel" },
  { value: 6, label: "Toll Violation" },
  { value: 7, label: "Traffic Violation" },
  { value: 8, label: "Other" },
];

function RentalLifecycleCard({ bookingMongoId }: { bookingMongoId: string }) {
  const { address: walletAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [penaltyEth, setPenaltyEth] = useState("0");
  const [penaltyReason, setPenaltyReason] = useState(0);
  const [penaltyDesc, setPenaltyDesc] = useState("");
  const [manualPaymentId, setManualPaymentId] = useState("");

  // Derive on-chain bookingId from MongoDB _id (same as CryptoBookingFlow)
  const onChainBookingId = bookingMongoId.length > 10
    ? BigInt(keccak256(toHex(bookingMongoId))) % BigInt(2 ** 128)
    : BigInt(parseInt(bookingMongoId));

  // Look up paymentId from on-chain bookingId
  const { data: paymentIdRaw, error: lookupError, isLoading: lookupLoading } = usePaymentByBooking(onChainBookingId);
  const autoPaymentId = paymentIdRaw !== undefined ? BigInt(paymentIdRaw as any) : undefined;
  const hasAutoPayment = autoPaymentId !== undefined && autoPaymentId > BigInt(0);

  // Allow manual override if auto-lookup fails
  const manualId = manualPaymentId ? BigInt(manualPaymentId) : undefined;
  const paymentId = hasAutoPayment ? autoPaymentId : manualId;
  const hasPayment = paymentId !== undefined && paymentId > BigInt(0);

  // Debug: log lookup details
  useEffect(() => {
    console.log("[RentalLifecycle] bookingMongoId:", bookingMongoId);
    console.log("[RentalLifecycle] onChainBookingId:", onChainBookingId.toString());
    console.log("[RentalLifecycle] paymentIdRaw:", paymentIdRaw);
    console.log("[RentalLifecycle] lookupError:", lookupError);
    console.log("[RentalLifecycle] lookupLoading:", lookupLoading);
  }, [bookingMongoId, onChainBookingId, paymentIdRaw, lookupError, lookupLoading]);

  // Read full payment details
  const { data: paymentRaw, refetch: refetchPayment } = useRentalPaymentDetails(hasPayment ? paymentId : undefined);
  const payment = paymentRaw as any;
  const paymentState = payment ? Number(payment.state ?? payment[8]) : -1;
  const vehicleId = payment ? BigInt(payment.vehicleId ?? payment[2] ?? 0) : undefined;
  const totalAmount = payment ? BigInt(payment.totalAmount ?? payment[7] ?? 0) : BigInt(0);

  // Read vehicle revenue
  const { data: revenueRaw, refetch: refetchRevenue } = useVehicleRevenue(
    vehicleId && vehicleId > BigInt(0) ? vehicleId : undefined
  );
  const revenue = revenueRaw as any;
  const accumulated = revenue?.accumulatedRevenue ? BigInt(revenue.accumulatedRevenue) : BigInt(0);

  // Write hooks
  const {
    startRental, hash: startHash,
    isConfirming: startConfirming, isSuccess: startSuccess,
    isPending: startPending, error: startError,
  } = useStartRental();

  const {
    completeRental, hash: completeHash,
    isConfirming: completeConfirming, isSuccess: completeSuccess,
    isPending: completePending, error: completeError,
  } = useCompleteRental();

  const {
    distributeRevenue, hash: distHash,
    isConfirming: distConfirming, isSuccess: distSuccess,
    isPending: distPending, error: distError,
  } = useDistributeRevenue();

  // Refetch on success + DB sync
  useEffect(() => {
    if (startSuccess) { toast.success("Rental started on-chain!"); refetchPayment(); }
  }, [startSuccess]);
  useEffect(() => {
    if (completeSuccess) {
      toast.success("Rental completed! Escrow released.");
      refetchPayment();
      refetchRevenue();
      // Revenue is NOT recorded to DB here — the gross amount includes waterfall fees
      // (platform 15%, maintenance 10%, rentor 25% [operator+insurance+operating]).
      // Only ~50% reaches investors, split by token ownership.
      // Accurate revenue is recorded when each investor claims via RevenueClaimCard.
    }
  }, [completeSuccess]);
  useEffect(() => {
    if (distSuccess) { toast.success("Revenue distributed!"); refetchRevenue(); }
  }, [distSuccess]);

  // Error toasts
  useEffect(() => { if (startError) toast.error(startError.message?.slice(0, 120) || "Start rental failed"); }, [startError]);
  useEffect(() => { if (completeError) toast.error(completeError.message?.slice(0, 120) || "Complete rental failed"); }, [completeError]);
  useEffect(() => { if (distError) toast.error(distError.message?.slice(0, 120) || "Distribution failed"); }, [distError]);

  const stateLabel = paymentState >= 0 ? PAYMENT_STATES[paymentState] || "UNKNOWN" : "Loading...";
  const stateColor = paymentState === 4 ? "text-green-700" : paymentState === 2 ? "text-blue-700" : paymentState === 1 ? "text-yellow-700" : "text-gray-700";
  const lastHash = distHash || completeHash || startHash;

  // Gate: wallet must be connected for on-chain operations
  if (!isConnected) {
    return (
      <Card className="mt-4">
        <CardContent className="p-6">
          <Heading as="h3" className="mb-2">On-Chain Rental Lifecycle</Heading>
          <p className="text-sm text-gray-500 mb-3">
            Connect your wallet to Sepolia to manage the on-chain rental lifecycle.
          </p>
          <div className="flex flex-col gap-2">
            {connectors.map((connector) => (
              <Button
                key={connector.uid}
                onClick={() => connect({ connector })}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Connect {connector.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasPayment) {
    return (
      <Card className="mt-4">
        <CardContent className="p-6">
          <Heading as="h3" className="mb-2">On-Chain Rental Lifecycle</Heading>
          <p className="text-sm text-gray-500">
            {lookupLoading
              ? "Loading on-chain payment data..."
              : lookupError
                ? `Error reading contract: ${lookupError.message?.slice(0, 80)}`
                : "Auto-lookup returned no payment. You can enter the Payment ID manually below."}
          </p>
          <div className="mt-3 text-xs text-gray-400 font-mono space-y-1">
            <p>Booking ID: {bookingMongoId}</p>
            <p>On-chain ID: {onChainBookingId.toString()}</p>
            <p>Auto-lookup result: {String(paymentIdRaw)}</p>
          </div>
          <div className="mt-4 flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-600 mb-1 block">Manual Payment ID</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g. 1"
                value={manualPaymentId}
                onChange={(e) => setManualPaymentId(e.target.value)}
                min={1}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Check Etherscan or the renter&apos;s tx to find the Payment ID.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-2 border-indigo-200">
      <CardContent className="p-6">
        <Heading as="h3" className="mb-4">On-Chain Rental Lifecycle</Heading>

        {/* Payment Info */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Payment ID</span>
            <span className="font-mono font-semibold">#{paymentId!.toString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">State</span>
            <span className={`font-semibold ${stateColor}`}>{stateLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Escrow Amount</span>
            <span className="font-semibold">{formatEther(totalAmount)} ETH</span>
          </div>
          {vehicleId && vehicleId > BigInt(0) && (
            <div className="flex justify-between">
              <span className="text-gray-600">Vehicle NFT</span>
              <span className="font-mono font-semibold">#{vehicleId.toString()}</span>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Step 1: Start Rental */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Step 1: Start Rental
          </p>
          {paymentState < 1 ? (
            <p className="text-xs text-gray-400">Waiting for escrow...</p>
          ) : paymentState === 1 ? (
            <Button
              onClick={() => startRental(paymentId!)}
              disabled={startPending || startConfirming}
              className="w-full"
              size="sm"
            >
              {startPending ? "Confirm in Wallet..." : startConfirming ? "Confirming..." : "Start Rental"}
            </Button>
          ) : (
            <p className="text-xs text-green-600 font-medium">Rental started</p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Step 2: Complete Rental */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Step 2: Complete Rental
          </p>
          {paymentState < 2 ? (
            <p className="text-xs text-gray-400">Start rental first...</p>
          ) : paymentState === 2 ? (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Penalty (ETH)</label>
                <input
                  type="number"
                  value={penaltyEth}
                  onChange={(e) => setPenaltyEth(e.target.value)}
                  min="0"
                  step="0.001"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Reason</label>
                <select
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                >
                  {PENALTY_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {penaltyReason > 0 && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    value={penaltyDesc}
                    onChange={(e) => setPenaltyDesc(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}
              <Button
                onClick={() => {
                  const penaltyWei = parseFloat(penaltyEth) > 0 ? parseEther(penaltyEth) : BigInt(0);
                  completeRental(paymentId!, penaltyWei, penaltyReason, penaltyDesc || "No penalty");
                }}
                disabled={completePending || completeConfirming}
                className="w-full"
                size="sm"
              >
                {completePending ? "Confirm in Wallet..." : completeConfirming ? "Confirming..." : "Complete Rental"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-green-600 font-medium">Rental completed &amp; escrow released</p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Step 3: Distribute Revenue */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Step 3: Distribute Revenue
          </p>
          {paymentState < 4 ? (
            <p className="text-xs text-gray-400">Complete rental first...</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Accumulated</span>
                <span className="font-semibold">{formatEther(accumulated)} ETH</span>
              </div>
              <Button
                onClick={() => vehicleId && distributeRevenue(vehicleId)}
                disabled={distPending || distConfirming || accumulated === BigInt(0) || !vehicleId}
                className="w-full"
                size="sm"
                variant="outline"
              >
                {distPending ? "Confirm in Wallet..." : distConfirming ? "Distributing..." : "Distribute Revenue"}
              </Button>
            </div>
          )}
        </div>

        {/* Transaction link */}
        {lastHash && (
          <div className="mt-4 pt-3 border-t">
            <a
              href={getEtherscanUrl(SEPOLIA_CHAIN_ID, lastHash, "tx")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              Latest Tx: {lastHash.slice(0, 14)}...
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
