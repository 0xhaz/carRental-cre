import { useState } from "react";
import { Button, Input, Separator, Badge, Card, CardContent } from "@/components/ui";
import { Vehicle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useBookingFlowStore } from "@/store";

export interface BookingFlowProps {
  vehicle: Vehicle;
  onComplete?: () => void;
  onCancel?: () => void;
}

type BookingStep = "dates" | "details" | "review";

export function BookingFlow({ vehicle, onComplete, onCancel }: BookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>("dates");
  const {
    pickupDate,
    returnDate,
    pickupLocation,
    setPickupDate,
    setReturnDate,
    setPickupLocation,
  } = useBookingFlowStore();

  const [additionalDriver, setAdditionalDriver] = useState(false);
  const [insuranceUpgrade, setInsuranceUpgrade] = useState(false);

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
  // Mock insurance cost (insurance not in Vehicle type yet)
  const mockInsuranceCost = 15;
  const insuranceCost = mockInsuranceCost * days;
  const additionalDriverCost = additionalDriver ? 10 * days : 0;
  const insuranceUpgradeCost = insuranceUpgrade ? 15 * days : 0;
  const totalPrice = basePrice + insuranceCost + additionalDriverCost + insuranceUpgradeCost;

  const handleNext = () => {
    if (currentStep === "dates") {
      if (!pickupDate || !returnDate) {
        alert("Please select pickup and return dates");
        return;
      }
      setCurrentStep("details");
    } else if (currentStep === "details") {
      if (!pickupLocation) {
        alert("Please enter pickup location");
        return;
      }
      setCurrentStep("review");
    } else {
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("dates");
    } else if (currentStep === "review") {
      setCurrentStep("details");
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === "dates"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            1
          </div>
          <span className="text-sm font-medium">Dates</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === "details"
                ? "bg-primary text-white"
                : currentStep === "review"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            2
          </div>
          <span className="text-sm font-medium">Details</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === "review"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            3
          </div>
          <span className="text-sm font-medium">Review</span>
        </div>
      </div>

      <Separator />

      {/* Step Content */}
      <div className="min-h-[300px]">
        {currentStep === "dates" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Select Rental Dates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pickup Date</label>
                <Input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Return Date</label>
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

        {currentStep === "details" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Booking Details</h3>

            <div>
              <label className="block text-sm font-medium mb-2">Pickup Location</label>
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
                    <p className="text-sm text-gray-600">
                      Add another person to drive
                    </p>
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
                    <p className="text-sm text-gray-600">
                      Full coverage with zero deductible
                    </p>
                  </div>
                  <span className="font-semibold">+{formatCurrency(15)}/day</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === "review" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Review & Confirm</h3>

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

            {/* Booking Details */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup Date:</span>
                  <span className="font-medium">{formatDate(pickupDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Return Date:</span>
                  <span className="font-medium">{formatDate(returnDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">
                    {days} {days === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup Location:</span>
                  <span className="font-medium">{pickupLocation}</span>
                </div>
              </CardContent>
            </Card>

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
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Your booking request will be sent to the vehicle
                  owner for approval. You will be notified once it's confirmed.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={currentStep === "dates" ? onCancel : handleBack}>
          {currentStep === "dates" ? "Cancel" : "Back"}
        </Button>
        <Button onClick={handleNext}>
          {currentStep === "review" ? "Confirm Booking" : "Next"}
        </Button>
      </div>
    </div>
  );
}
