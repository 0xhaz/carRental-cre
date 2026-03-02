"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heading,
  Paragraph,
  Button,
  Card,
  CardContent,
  Badge,
  Progress,
} from "@/components/ui";
import { Booking, Vehicle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { bookingApi, vehicleApi } from "@/lib/api";

export default function ActiveRentalPage() {
  const router = useRouter();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    const loadActiveRental = async () => {
      setIsLoading(true);
      try {
        const response = await bookingApi.getUserBookings();
        if (response.success) {
          const bookings = response.data || [];
          const now = new Date();
          const active = bookings.find(
            (b: Booking) =>
              b.status === "active" ||
              (b.status === "confirmed" &&
                new Date(b.pickupDate) <= now &&
                new Date(b.returnDate) >= now)
          );

          if (active) {
            setActiveBooking(active);
            const carId = typeof active.car === "string" ? active.car : (active.car as any)?._id;
            if (carId) {
              try {
                const vehicleRes = await vehicleApi.getById(carId);
                if (vehicleRes.success) {
                  setVehicle(vehicleRes.data);
                }
              } catch {
                // Vehicle details may be embedded in booking
                if (typeof active.car === "object") {
                  setVehicle(active.car as unknown as Vehicle);
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error("Failed to load active rental:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActiveRental();
  }, []);

  // Update time remaining
  useEffect(() => {
    if (!activeBooking) return;

    const updateTime = () => {
      const now = new Date();
      const end = new Date(activeBooking.returnDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Rental period ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [activeBooking]);

  const handleExtendRental = () => {
    toast.success("Rental extension request submitted!");
  };

  const handleReportIssue = () => {
    router.push(`/renter/booking/${activeBooking?._id}?action=report-issue`);
  };

  const handleEmergencyContact = () => {
    toast("Emergency contact: +1 (555) 911-HELP", {
      icon: "🚨",
      duration: 5000,
    });
  };

  const handleEndRental = () => {
    toast.success("Rental ended early. Please return the vehicle to the pickup location.");
    router.push("/renter/bookings");
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

  if (!activeBooking || !vehicle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <div className="mb-4 text-6xl">🚗</div>
          <Heading as="h2" className="mb-4">
            No Active Rental
          </Heading>
          <Paragraph className="mb-6">
            You don't have any active rentals at the moment.
          </Paragraph>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push("/renter/browse")}>
              Browse Vehicles
            </Button>
            <Button variant="outline" onClick={() => router.push("/renter/bookings")}>
              View My Bookings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const timeProgress =
    ((new Date().getTime() - new Date(activeBooking.pickupDate).getTime()) /
      (new Date(activeBooking.returnDate).getTime() -
        new Date(activeBooking.pickupDate).getTime())) *
    100;

  const isOverdue = new Date() > new Date(activeBooking.returnDate);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Status */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading as="h1" className="mb-2">
            Active Rental
          </Heading>
          <Paragraph className="text-lg">
            Currently renting {vehicle.brand} {vehicle.model}
          </Paragraph>
        </div>
        <Badge variant={isOverdue ? "error" : "success"} className="text-lg px-4 py-2">
          {isOverdue ? "Overdue" : "Active"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Card */}
          <Card className="overflow-hidden">
            <div className="relative h-80">
              <Image
                src={vehicle.image || "/assets/car_image1.png"}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-full h-full object-cover"
                width={800}
                height={400}
              />
              <div className="absolute top-4 left-4">
                <Badge variant="success" className="shadow-lg text-base px-3 py-1">
                  Currently Renting
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-2">
                {vehicle.brand} {vehicle.model} ({vehicle.year})
              </Heading>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                <span>{vehicle.location}</span>
                <span>{vehicle.category}</span>
                <span>{vehicle.fuel_type}</span>
                <span>{vehicle.seating_capacity} seats</span>
              </div>
            </CardContent>
          </Card>

          {/* Rental Period */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Rental Period
              </Heading>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Started</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatDate(activeBooking.pickupDate)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Ends</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatDate(activeBooking.returnDate)}
                  </p>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold">Time Progress</span>
                  <span className={isOverdue ? "text-red-600" : ""}>
                    {timeProgress.toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(timeProgress, 100)}
                  variant={isOverdue ? "error" : "default"}
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Time Remaining: {timeRemaining}</span>
                  <span>
                    {Math.ceil(
                      (new Date(activeBooking.returnDate).getTime() -
                        new Date(activeBooking.pickupDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    days total
                  </span>
                </div>
              </div>

              {isOverdue && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Rental Overdue:</strong> Please return the vehicle as soon
                    as possible to avoid additional charges.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Payment Information
              </Heading>

              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="font-bold">{formatCurrency(activeBooking.price)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(vehicle.pricePerDay)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Refundable on Return</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(vehicle.pricePerDay)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <Heading as="h3" className="mb-4">
                  Quick Actions
                </Heading>

                <div className="space-y-3">
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleExtendRental}
                  >
                    Extend Rental
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleReportIssue}
                  >
                    Report Issue
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleEmergencyContact}
                  >
                    Emergency Contact
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleEndRental}
                  >
                    End Rental Early
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Important Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <Heading as="h4" className="mb-3 text-blue-900">
                  Important Reminders
                </Heading>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>Return vehicle with same fuel level</li>
                  <li>Take photos before returning</li>
                  <li>Report any damage immediately</li>
                  <li>Return to: {vehicle.location}</li>
                  <li>Late returns incur additional charges</li>
                </ul>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardContent className="p-6">
                <Heading as="h4" className="mb-3">
                  Need Help?
                </Heading>
                <Paragraph className="text-sm text-gray-600 mb-4">
                  Our support team is available 24/7 to assist you.
                </Paragraph>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
