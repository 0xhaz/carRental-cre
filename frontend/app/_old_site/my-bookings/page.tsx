"use client";
import Title from "@/components/Title";
import { useAppContext } from "@/context/AppContext";
import { assets } from "@/public/assets/assets";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Booking = {
  _id: string;
  car: {
    image: string;
    brand: string;
    model: string;
    year: string | number;
    category: string;
    location: string;
  };
  status: string;
  pickupDate: string;
  returnDate: string;
  price: number;
  createdAt: string;
};

const MyBookings = () => {
  const { user, axios, currency } = useAppContext();
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetchMyBookings = async () => {
    try {
      const { data } = await axios.get("/api/bookings/user");

      if (data.success) {
        setBookings(data.bookings || []);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    }
  };

  useEffect(() => {
    user && fetchMyBookings();
  }, [user]);

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16 text-sm max-w-7xl">
      <Title
        title="My Bookings"
        subtitle="View and manage your all car bookings"
      />
      <div>
        {bookings.map((booking, index) => (
          <div
            key={booking._id}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border border-borderColor rounded-lg mt-5 first:mt-12"
          >
            {/* Car Image + Info */}
            <div className="md:col-span-1">
              <div className="rounded-md overflow-hidden mb-3">
                <Image
                  src={booking.car.image}
                  alt=""
                  className="w-full h-auto aspect-video object-cover"
                  width={78}
                  height={48}
                />
              </div>
              <p className="text-lg font-medium mt-2">
                {booking.car.brand} {booking.car.model}
              </p>

              <p className="text-gray-500">
                {booking.car.year} · {booking.car.category} ·{" "}
                {booking.car.location}
              </p>
            </div>

            {/* Booking Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <p className="px-3 py-1.5 bg-light rounded">
                  Booking #{index + 1}
                </p>
                <p
                  className={`px-3 py-1 text-xs rounded-full ${booking.status === "confirmed" ? "bg-green-400/15 text-green-600" : "bg-red-400/15 text-red-600"}`}
                >
                  {booking.status}
                </p>
              </div>

              <div className="flex items-start gap-2 mt-3">
                <Image
                  src={assets.calendar_icon_colored}
                  alt="Calendar"
                  className="w-4 h-4 mt-1"
                />
                <div>
                  <p className="text-gray-500">Rental Period</p>
                  <p>
                    {booking.pickupDate.split("T")[0]} To{" "}
                    {booking.returnDate.split("T")[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 mt-3">
                <Image
                  src={assets.location_icon_colored}
                  alt="Calendar"
                  className="w-4 h-4 mt-1"
                />
                <div>
                  <p className="text-gray-500">Pickup Location</p>
                  <p>{booking.car.location}</p>
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div className="md:col-span-1 flex flex-col justify-between gap-6">
              <div className="text-sm text-gray-500 text-right">
                <p>Total Price</p>
                <h1 className="text-2xl font-semibold text-primary">
                  {currency}
                  {booking.price}
                </h1>
                <p>Booked on {booking.createdAt.split("T")[0]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyBookings;
