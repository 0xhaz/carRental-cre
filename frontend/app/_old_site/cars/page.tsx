"use client";
import CarCard from "@/components/CarCard";
import Title from "@/components/Title";
import { useAppContext } from "@/context/AppContext";
import { assets, dummyCarData } from "@/public/assets/assets";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const Cars = () => {
  const searchParams = useSearchParams();
  const pickupLocation = searchParams.get("pickupLocation");
  const pickupDate = searchParams.get("pickupDate");
  const returnDate = searchParams.get("returnDate");

  const [input, setInput] = useState("");

  const { cars, axios } = useAppContext();

  const isSearchData = pickupLocation && pickupDate && returnDate;
  const [filteredCars, setFilteredCars] = useState<typeof cars>([]);

  const applyFilter = () => {
    if (input === "") {
      setFilteredCars(cars);
      return null;
    }

    const filtered = cars.slice().filter(car => {
      return (
        car.brand.toLowerCase().includes(input.toLowerCase()) ||
        car.model.toLowerCase().includes(input.toLowerCase()) ||
        car.category.toLowerCase().includes(input.toLowerCase()) ||
        car.fuel_type.toLowerCase().includes(input.toLowerCase()) ||
        car.transmission.toLowerCase().includes(input.toLowerCase())
      );
    });

    setFilteredCars(filtered);
  };

  const searchCarAvailability = async () => {
    const { data } = await axios.post("/api/bookings/check-availability", {
      location: pickupLocation,
      pickupDate,
      returnDate,
    });
    console.log(data);

    if (data.success) {
      setFilteredCars(data.availableCars || []);
      if (data.availableCars?.length === 0) {
        toast("No cars available for the selected dates and location", {
          icon: "😔",
        });
      }
      return null;
    }
  };

  useEffect(() => {
    isSearchData && searchCarAvailability();
  }, []);

  useEffect(() => {
    cars.length > 0 && !isSearchData && applyFilter();
  }, [input, cars]);

  return (
    <div>
      <div className="flex flex-col items-center py-20 bg-light max-md:px-4 ">
        <Title
          title="Available Cars"
          subtitle="Browse our selection of premium vehicles available for your next adventure"
        />

        <div className="flex items-center bg-white px-4 mt-6 max-w-140 w-full h-12 rounded-full shadow">
          <Image
            src={assets.search_icon}
            alt="Search"
            className="h-4.5 w-4.5 mr-2"
          />
          <input
            onChange={e => setInput(e.target.value)}
            value={input}
            type="text"
            placeholder="Search by make, model, or features"
            className="w-full h-full outline-none text-gray-500"
          />
          <Image
            src={assets.filter_icon}
            alt="Filter"
            className="h-4.5 w-4.5 ml-2"
          />
        </div>
      </div>

      <div className="px-6 md:px-16 lg:px-24 xl:px-32 mt-10">
        <p className="text-gray-500 xl:px-20 max-w-7xl mx-auto">
          Showing {filteredCars?.length} Cars
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-4 xl:px-20 max-w-7xl mx-auto">
          {filteredCars?.map((car, index) => (
            <div key={index}>
              <CarCard car={car} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cars;
