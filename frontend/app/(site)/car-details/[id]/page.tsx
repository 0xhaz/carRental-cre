"use client";
import Loader from "@/components/Loader";
import { useAppContext } from "@/context/AppContext";
import { assets } from "@/public/assets/assets";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

const CarDetails = () => {
  const router = useRouter();
  const {
    cars,
    axios,
    currency,
    pickupDate,
    setPickupDate,
    returnDate,
    setReturnDate,
  } = useAppContext();
  const { id } = useParams<{ id: string }>();
  const [car, setCar] = useState<(typeof cars)[number] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await axios.post("/api/bookings/create", {
        car: id,
        pickupDate,
        returnDate,
      });
      console.log(data);

      if (data.success) {
        toast.success(data.message);
        router.push("/my-bookings");
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
    setCar(cars.find(car => car._id === id) ?? null);
  }, [id]);

  return car ? (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32 mt-16">
      <button className="flex items-center gap-2 mb-6 text-gray-500">
        <Link href="/cars">
          <Image
            src={assets.arrow_icon}
            alt=""
            className="rotate-180 opacity-65"
          />
        </Link>
        Back to all cars
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Left: Car Image & Details */}
        <div className="lg:col-span-2">
          <Image
            src={car.image}
            alt=""
            className="w-full h-auto md:max-h-100 object-cover rounded-xl mb-6 shadow-md"
            width={400}
            height={300}
          />
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">
                {car.brand} {car.model}
              </h1>
              <p>
                {car.category} · {car.year}
              </p>
            </div>
            <hr className="border-borderColor my-6" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  icon: assets.users_icon,
                  text: `${car.seating_capacity} Seats`,
                },
                { icon: assets.fuel_icon, text: `${car.fuel_type}` },
                { icon: assets.car_icon, text: `${car.transmission}` },
                { icon: assets.location_icon, text: `${car.location}` },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex flex-col items-center bg-light p-4 rounded-lg"
                >
                  <Image src={icon} alt="" className="h-5 mb-2" />
                  {text}
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <h1 className="text-xl font-medium mb-3">Description</h1>
              <p className="text-gray-500">{car.description}</p>
            </div>
            {/* Features */}
            <div>
              <h1 className="text-xl font-medium mb-3">Features</h1>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "360 Camera",
                  "Bluetooth",
                  "Backup Sensor",
                  "Cruise Control",
                  "Heated Seats",
                  "Keyless Entry",
                  "Leather Seats",
                  "Navigation System",
                ].map(item => (
                  <li key={item} className="flex items-center text-gray-500">
                    <Image
                      src={assets.check_icon}
                      className="h-4 mr-2"
                      alt=""
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Booking Form */}
        <form
          onSubmit={handleSubmit}
          className="shadow-lg h-max sticky top-18 rounded-xl p-6 space-y-6 text-gray-500"
        >
          <p className="flex items-center justify-between text-2xl text-gray-800 font-semibold">
            {currency}
            {car.pricePerDay}
            <span className="text-base text-gray-400 font-normal">per day</span>
          </p>
          <hr className="border-borderColor my-6" />

          <div className="flex flex-col gap-2">
            <label htmlFor="pickup-date">Pickup Date</label>
            <input
              value={pickupDate}
              onChange={e => setPickupDate(e.target.value)}
              type="date"
              className="border border-borderColor px-3 py-2 rounded-lg"
              required
              id="pickup-date"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="return-date">Return Date</label>
            <input
              value={returnDate}
              onChange={e => setReturnDate(e.target.value)}
              type="date"
              className="border border-borderColor px-3 py-2 rounded-lg"
              required
              id="return-date"
            />
          </div>

          <button className="w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium text-white rounded-xl cursor-pointer">
            Book Now
          </button>

          <p className="text-center text-sm">
            No credit card required to reserve
          </p>
        </form>
      </div>
    </div>
  ) : (
    <Loader />
  );
};

export default CarDetails;
