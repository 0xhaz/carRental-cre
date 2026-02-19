"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Separator, Badge, Card, CardContent } from "@/components/ui";
import { Vehicle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useBookingFlowStore } from "@/store";
import { RenterDetailsForm, type RenterDetails } from "./RenterDetailsForm";
import { PaymentMethodSelector, type PaymentDetails } from "./PaymentMethodSelector";
import { toast } from "react-hot-toast";
import { renterApi } from "@/lib/api";
import { useCanRenterAct } from "@/hooks/useComplianceStatus";
import CryptoBookingFlow from "./CryptoBookingFlow";

export interface BookingFlowEnhancedProps {
  vehicle: Vehicle;
  onComplete?: (bookingData: any) => void;
  onCancel?: () => void;
}

type BookingStep = "dates" | "renter_details" | "booking_details" | "payment" | "review";

export function BookingFlowEnhanced({ vehicle, onComplete, onCancel }: BookingFlowEnhancedProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>("dates");
  const {
    pickupDate,
    returnDate,
    pickupLocation,
    setPickupDate,
    setReturnDate,
    setPickupLocation,
  } = useBookingFlowStore();

  const { canAct: isRenterVerified } = useCanRenterAct();
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [renterDetails, setRenterDetails] = useState<RenterDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [additionalDriver, setAdditionalDriver] = useState(false);
  const [insuranceUpgrade, setInsuranceUpgrade] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false); // Synchronous guard against double-submission
  const [cryptoBookingId, setCryptoBookingId] = useState<string | null>(null);
  const [showCryptoPayment, setShowCryptoPayment] = useState(false);

  // Pre-populate renter details from verified profile
  useEffect(() => {
    if (isRenterVerified && !profileLoaded) {
      renterApi
        .getProfile()
        .then((res) => {
          if (res.success && res.profile) {
            const p = res.profile;
            setRenterDetails({
              fullName: p.personalInfo?.fullName || "",
              email: p.personalInfo?.email || "",
              phone: p.personalInfo?.phone || "",
              dateOfBirth: p.personalInfo?.dateOfBirth
                ? new Date(p.personalInfo.dateOfBirth).toISOString().split("T")[0]
                : "",
              address: p.address?.street || "",
              city: p.address?.city || "",
              state: p.address?.state || "",
              zipCode: p.address?.zipCode || "",
              driverLicense: {
                number: p.driverLicense?.number || "",
                expiryDate: p.driverLicense?.expiryDate
                  ? new Date(p.driverLicense.expiryDate).toISOString().split("T")[0]
                  : "",
                issuingState: p.driverLicense?.issuingState || "",
                // Images were uploaded during KYC — not needed for verified renters
              },
            });
            setProfileLoaded(true);
          }
        })
        .catch((err) => {
          console.error("Failed to load renter profile:", err);
        });
    }
  }, [isRenterVerified, profileLoaded]);

  // Calculate booking details
  const calculateDays = () => {
    if (!pickupDate || !returnDate) return 0;
    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);
    const diffTime = Math.abs(returnD.getTime() - pickup.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const days = calculateDays();
  const basePrice = vehicle.pricePerDay * days;
  const mockInsuranceCost = 15;
  const insuranceCost = mockInsuranceCost * days;
  const additionalDriverCost = additionalDriver ? 10 * days : 0;
  const insuranceUpgradeCost = insuranceUpgrade ? 15 * days : 0;
  const totalPrice = basePrice + insuranceCost + additionalDriverCost + insuranceUpgradeCost;

  const validateRenterDetails = (): boolean => {
    if (!renterDetails) return false;
    const { fullName, email, phone, address, city, state, zipCode, dateOfBirth, driverLicense } =
      renterDetails;

    return !!(
      fullName &&
      email &&
      phone &&
      address &&
      city &&
      state &&
      zipCode &&
      dateOfBirth &&
      driverLicense.number &&
      driverLicense.expiryDate &&
      driverLicense.issuingState &&
      driverLicense.frontImage &&
      driverLicense.backImage
    );
  };

  const handleNext = async () => {
    if (currentStep === "dates") {
      if (!pickupDate || !returnDate) {
        toast.error("Please select pickup and return dates");
        return;
      }
      // Skip renter_details if verified profile is loaded
      if (isRenterVerified && profileLoaded) {
        setCurrentStep("booking_details");
      } else {
        setCurrentStep("renter_details");
      }
    } else if (currentStep === "renter_details") {
      if (!validateRenterDetails()) {
        toast.error("Please complete all required fields and upload your driver's license");
        return;
      }
      setCurrentStep("booking_details");
    } else if (currentStep === "booking_details") {
      if (!pickupLocation) {
        toast.error("Please enter pickup location");
        return;
      }
      setCurrentStep("payment");
    } else if (currentStep === "payment") {
      if (!paymentDetails) {
        toast.error("Please select a payment method");
        return;
      }
      setCurrentStep("review");
    } else {
      // Final confirmation - submit booking
      if (!renterDetails) {
        toast.error("Missing renter details");
        return;
      }

      // Synchronous guard: useRef prevents double-submission even if React
      // hasn't re-rendered yet (useState is async, so rapid clicks can bypass it)
      if (submittingRef.current) return;
      submittingRef.current = true;
      setIsSubmitting(true);

      try {
        const bookingSubmission = {
          vehicleId: vehicle._id,
          dates: { pickupDate, returnDate, days },
          renterDetails: {
            fullName: renterDetails.fullName,
            email: renterDetails.email,
            phone: renterDetails.phone,
            address: renterDetails.address,
            city: renterDetails.city,
            state: renterDetails.state,
            zipCode: renterDetails.zipCode,
            dateOfBirth: renterDetails.dateOfBirth,
            driverLicense: {
              number: renterDetails.driverLicense.number,
              expiryDate: renterDetails.driverLicense.expiryDate,
              issuingState: renterDetails.driverLicense.issuingState,
              frontImage: renterDetails.driverLicense.frontImage,
              backImage: renterDetails.driverLicense.backImage,
            },
          },
          bookingDetails: {
            pickupLocation,
            additionalDriver,
            insuranceUpgrade,
          },
          payment: paymentDetails!,
          pricing: {
            basePrice,
            insuranceCost,
            additionalDriverCost,
            insuranceUpgradeCost,
            totalPrice,
          },
        };

        const response = await renterApi.submitBooking(bookingSubmission);

        if (response.success) {
          // If crypto payment, show on-chain payment flow
          if (paymentDetails?.method === "crypto" && response.booking?._id) {
            setCryptoBookingId(response.booking._id);
            setShowCryptoPayment(true);
            toast.success("Booking created! Complete on-chain payment below.");
          } else {
            toast.success("Booking submitted successfully! Waiting for owner approval.");
            onComplete?.(response.booking);
          }
        }
      } catch (error: any) {
        console.error("Booking submission error:", error);
        toast.error(error.response?.data?.message || "Failed to submit booking");
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === "renter_details") {
      setCurrentStep("dates");
    } else if (currentStep === "booking_details") {
      // Skip back to dates if renter_details was skipped
      if (isRenterVerified && profileLoaded) {
        setCurrentStep("dates");
      } else {
        setCurrentStep("renter_details");
      }
    } else if (currentStep === "payment") {
      setCurrentStep("booking_details");
    } else if (currentStep === "review") {
      setCurrentStep("payment");
    }
  };

  const allSteps = [
    { id: "dates", label: "Dates" },
    ...((isRenterVerified && profileLoaded)
      ? []
      : [{ id: "renter_details", label: "Your Details" }]),
    { id: "booking_details", label: "Booking Info" },
    { id: "payment", label: "Payment" },
    { id: "review", label: "Review" },
  ];
  const steps = allSteps.map((s, i) => ({ ...s, number: i + 1 }));

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  index < currentStepIndex
                    ? "bg-green-500 text-white"
                    : index === currentStepIndex
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {index < currentStepIndex ? "✓" : step.number}
              </div>
              <span className="text-xs font-medium mt-1">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-12 md:w-20 h-0.5 bg-gray-200 mx-2 mt-[-16px]" />
            )}
          </div>
        ))}
      </div>

      <Separator />

      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* Step 1: Dates */}
        {currentStep === "dates" && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Select Rental Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pickup Date *</label>
                <Input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Return Date *</label>
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={pickupDate || new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            {days > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Duration:</strong> {days} {days === 1 ? "day" : "days"}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Estimated Cost:</strong> {formatCurrency(basePrice)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Renter Details */}
        {currentStep === "renter_details" && (
          <div>
            <h3 className="text-xl font-bold mb-4">Your Information</h3>
            <RenterDetailsForm
              initialData={renterDetails || undefined}
              onChange={setRenterDetails}
            />
          </div>
        )}

        {/* Step 3: Booking Details */}
        {currentStep === "booking_details" && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Booking Details</h3>

            <div>
              <label className="block text-sm font-medium mb-2">Pickup Location *</label>
              <Input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Enter pickup address"
              />
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-3">Add-ons</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={additionalDriver}
                    onChange={(e) => setAdditionalDriver(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Additional Driver</p>
                    <p className="text-sm text-gray-600">Add another person to drive</p>
                  </div>
                  <span className="font-semibold">+{formatCurrency(10)}/day</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={insuranceUpgrade}
                    onChange={(e) => setInsuranceUpgrade(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Premium Insurance</p>
                    <p className="text-sm text-gray-600">Full coverage with zero deductible</p>
                  </div>
                  <span className="font-semibold">+{formatCurrency(15)}/day</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Payment Method */}
        {currentStep === "payment" && (
          <div>
            <PaymentMethodSelector totalAmount={totalPrice} onChange={setPaymentDetails} />
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === "review" && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Review & Confirm</h3>

            {/* Vehicle Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <img
                    src={vehicle.image}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div>
                    <h4 className="font-semibold">
                      {vehicle.brand} {vehicle.model}
                    </h4>
                    <p className="text-sm text-gray-600">{vehicle.year}</p>
                    <Badge variant="outline" className="mt-1">
                      {vehicle.category}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Renter Information */}
            {renterDetails && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3">Renter Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{renterDetails.fullName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 font-medium">{renterDetails.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <span className="ml-2 font-medium">{renterDetails.phone}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">License:</span>
                      <span className="ml-2 font-medium">{renterDetails.driverLicense.number}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Details */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h4 className="font-semibold mb-3">Booking Details</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pickup Date:</span>
                  <span className="font-medium">{formatDate(pickupDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Return Date:</span>
                  <span className="font-medium">{formatDate(returnDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">
                    {days} {days === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pickup Location:</span>
                  <span className="font-medium">{pickupLocation}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            {paymentDetails && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">Payment Method</h4>
                  <p className="text-sm">
                    {paymentDetails.method === "offline"
                      ? "💵 Cash/In-Person Payment"
                      : paymentDetails.method === "bank_transfer"
                      ? "🏦 Bank Transfer"
                      : `₿ Cryptocurrency (${paymentDetails.cryptoDetails?.selectedToken})`}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Price Breakdown */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h4 className="font-semibold mb-3">Price Breakdown</h4>
                <div className="flex justify-between text-sm">
                  <span>
                    Base Price ({formatCurrency(vehicle.pricePerDay)} × {days} days)
                  </span>
                  <span>{formatCurrency(basePrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Insurance</span>
                  <span>{formatCurrency(insuranceCost)}</span>
                </div>
                {additionalDriver && (
                  <div className="flex justify-between text-sm">
                    <span>Additional Driver</span>
                    <span>{formatCurrency(additionalDriverCost)}</span>
                  </div>
                )}
                {insuranceUpgrade && (
                  <div className="flex justify-between text-sm">
                    <span>Premium Insurance</span>
                    <span>{formatCurrency(insuranceUpgradeCost)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totalPrice)}</span>
                </div>
              </CardContent>
            </Card>

            {showCryptoPayment && cryptoBookingId ? (
              <CryptoBookingFlow
                vehicle={vehicle}
                bookingId={cryptoBookingId}
                pickupDate={pickupDate}
                returnDate={returnDate}
                totalPriceUsd={totalPrice}
                onComplete={(txHash) => {
                  onComplete?.({ _id: cryptoBookingId, txHash });
                }}
              />
            ) : (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>📋 Note:</strong> Your booking request will be sent to the vehicle owner for
                    approval. {paymentDetails?.method === "crypto" && "You will then complete the on-chain payment."}
                    {paymentDetails?.method !== "crypto" && "You will be notified once it's confirmed."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={currentStep === "dates" ? onCancel : handleBack}
          disabled={isSubmitting}
        >
          {currentStep === "dates" ? "Cancel" : "Back"}
        </Button>
        <Button onClick={handleNext} disabled={isSubmitting}>
          {isSubmitting
            ? "Submitting..."
            : currentStep === "review"
            ? "Confirm Booking"
            : "Next"}
        </Button>
      </div>
    </div>
  );
}
