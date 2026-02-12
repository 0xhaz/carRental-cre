"use client";

import TitleOwner from "@/components/TitleOwner";
import { useAppContext } from "@/context/AppContext";
import { assets, dummyCarData } from "@/public/assets/assets";
import Image from "next/image";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const ManageCars = () => {
  const { isOwner, axios, currency } = useAppContext();
  const [cars, setCars] = useState<typeof dummyCarData>([]);

  const fetchOwnerCars = async () => {
    try {
      const { data } = await axios.get("/api/owner/cars");

      if (data.success) {
        setCars(data.cars);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while fetching cars.";
      toast.error(message);
    }
  };

  const toggleAvailability = async (carId: string) => {
    try {
      const { data } = await axios.post("/api/owner/toggle-car", { carId });

      if (data.success) {
        toast.success(data.message);
        fetchOwnerCars();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while fetching cars.";
      toast.error(message);
    }
  };

  const deleteCar = async (carId: string) => {
    try {
      const confirm = window.confirm(
        "Are you sure you want to delete this car? This action cannot be undone.",
      );

      if (!confirm) return null;
      const { data } = await axios.post("/api/owner/delete-car", { carId });

      if (data.success) {
        toast.success(data.message);
        fetchOwnerCars();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while fetching cars.";
      toast.error(message);
    }
  };

  useEffect(() => {
    isOwner && fetchOwnerCars();
  }, [isOwner]);

  return (
    <div className="px-4 pt-10 md:px-10 w-full">
      <TitleOwner
        title="Manage Cars"
        subtitle="View all listed cars, update their details, or remove them from the booking platform"
      />

      <div className="max-w-3xl w-full rounded-md overflow-hidden border border-borderColor mt-6">
        <table className="w-full border-collapse text-left text-sm text-gray-600">
          <thead className="text-gray-500">
            <tr>
              <th className="p-3 font-medium">Car</th>
              <th className="p-3 font-medium max-md:hidden">Category</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cars.map((car, index) => (
              <tr key={index} className="border-t border-borderColor">
                <td className="p-3 flex items-center gap-3">
                  <Image
                    src={car.image}
                    alt=""
                    className="h-12 w-12 aspect-square rounded-md object-cover"
                    width={78}
                    height={78}
                  />
                  <div className="max-md:hidden">
                    <p className="font-medium">
                      {car.brand} {car.model}
                    </p>
                    <p className="text-xs text-gray-500">
                      {car.seating_capacity} · {car.transmission}
                    </p>
                  </div>
                </td>

                <td className="p-3 max-md:hidden">{car.category}</td>
                <td className="p-3 max">
                  {currency}
                  {car.pricePerDay}/day
                </td>
                <td className="p-3 max-md:hidden">
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${car.isAvailable ? "bg-green-100 text-green-500" : "bg-red-100 text-red-500"}`}
                  >
                    {car.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </td>

                <td className="flex items-center p-3">
                  <Image
                    src={
                      car.isAvailable ? assets.eye_close_icon : assets.eye_icon
                    }
                    alt=""
                    className="cursor-pointer"
                    onClick={() => toggleAvailability(car._id)}
                  />
                  <Image
                    src={assets.delete_icon}
                    alt=""
                    className="cursor-pointer"
                    onClick={() => deleteCar(car._id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageCars;
