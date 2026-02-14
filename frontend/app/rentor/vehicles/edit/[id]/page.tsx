"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, Button, Input, Heading, Paragraph } from "@/components/ui";
import { Vehicle } from "@/types";
import { toast } from "react-hot-toast";
import { cityList } from "@/constants/menuLinks";
import { vehicleApi } from "@/lib/api";

const categories = ["Sedan", "SUV", "Truck", "Van", "Hatchback", "Coupe"];
const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid"];
const transmissions = ["Manual", "Automatic", "Semi-Automatic"];

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: "",
    category: "Sedan",
    seatingCapacity: "4",
    fuelType: "Petrol",
    transmission: "Automatic",
    pricePerDay: "",
    location: cityList[0],
    description: "",
    image: "",
    isAvailable: true,
  });

  // Load existing vehicle data
  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const response = await vehicleApi.getRentorVehicles();
        if (response.success) {
          const vehicle = response.data.find((v: Vehicle) => v._id === vehicleId);
          if (vehicle) {
            setFormData({
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year.toString(),
              category: vehicle.category,
              seatingCapacity: vehicle.seating_capacity.toString(),
              fuelType: vehicle.fuel_type,
              transmission: vehicle.transmission,
              pricePerDay: vehicle.pricePerDay.toString(),
              location: vehicle.location,
              description: vehicle.description,
              image: vehicle.image || "",
              isAvailable: vehicle.isAvailable,
            });
          } else {
            toast.error("Vehicle not found");
            router.push("/rentor/vehicles");
          }
        }
      } catch (error: any) {
        console.error("Failed to load vehicle:", error);
        toast.error("Failed to load vehicle data");
        router.push("/rentor/vehicles");
      } finally {
        setIsLoading(false);
      }
    };

    if (vehicleId) {
      loadVehicle();
    }
  }, [vehicleId, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (!formData.brand || !formData.model || !formData.pricePerDay) {
        toast.error("Please fill in all required fields");
        return;
      }

      const pricePerDay = parseFloat(formData.pricePerDay);
      if (isNaN(pricePerDay) || pricePerDay <= 0) {
        toast.error("Please enter a valid price");
        return;
      }

      const year = parseInt(formData.year);
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        toast.error("Please enter a valid year");
        return;
      }

      const carData = {
        brand: formData.brand,
        model: formData.model,
        year,
        category: formData.category,
        seating_capacity: parseInt(formData.seatingCapacity),
        fuel_type: formData.fuelType,
        transmission: formData.transmission,
        pricePerDay,
        location: formData.location,
        description: formData.description,
        image: formData.image,
        isAvailable: formData.isAvailable,
      };

      const payload = new FormData();
      payload.append("carData", JSON.stringify(carData));

      const response = await vehicleApi.updateVehicle(vehicleId, payload);

      if (response.success) {
        toast.success("Vehicle updated successfully!");
        router.push("/rentor/vehicles");
      } else {
        toast.error((response as any).message || "Failed to update vehicle");
      }
    } catch (error: any) {
      console.error("Update vehicle error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update vehicle"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded" />
                ))}
              </div>
              <div className="h-24 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/rentor/vehicles")}
            className="mb-4"
          >
            &larr; Back to My Vehicles
          </Button>
          <Heading as="h1" className="mb-2">
            Edit Vehicle
          </Heading>
          <Paragraph>
            Update the details of your {formData.brand} {formData.model}
          </Paragraph>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image URL */}
            <div>
              <Input
                label="Image URL *"
                type="text"
                name="image"
                placeholder="https://example.com/car-image.jpg"
                value={formData.image}
                onChange={handleChange}
                required
                disabled={isSaving}
              />
              {formData.image && (
                <div className="mt-2">
                  <img
                    src={formData.image}
                    alt={`${formData.brand} ${formData.model}`}
                    className="w-full h-48 object-cover rounded-lg border border-borderColor"
                  />
                </div>
              )}
            </div>

            {/* Vehicle Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Brand *"
                type="text"
                name="brand"
                placeholder="e.g., Toyota"
                value={formData.brand}
                onChange={handleChange}
                required
                disabled={isSaving}
              />
              <Input
                label="Model *"
                type="text"
                name="model"
                placeholder="e.g., Camry"
                value={formData.model}
                onChange={handleChange}
                required
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Year"
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="1900"
                max={new Date().getFullYear() + 1}
                disabled={isSaving}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={isSaving}
                  className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Seating Capacity"
                type="number"
                name="seatingCapacity"
                value={formData.seatingCapacity}
                onChange={handleChange}
                min="2"
                max="12"
                disabled={isSaving}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fuel Type
                </label>
                <select
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleChange}
                  disabled={isSaving}
                  className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  {fuelTypes.map((fuel) => (
                    <option key={fuel} value={fuel}>
                      {fuel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transmission
                </label>
                <select
                  name="transmission"
                  value={formData.transmission}
                  onChange={handleChange}
                  disabled={isSaving}
                  className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  {transmissions.map((trans) => (
                    <option key={trans} value={trans}>
                      {trans}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Price Per Day ($) *"
                type="number"
                name="pricePerDay"
                placeholder="0.00"
                value={formData.pricePerDay}
                onChange={handleChange}
                required
                disabled={isSaving}
                min="0"
                step="0.01"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={isSaving}
                  className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  {cityList.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isSaving}
                rows={3}
                placeholder="Describe your vehicle..."
                className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isAvailable: e.target.checked,
                    }))
                  }
                  disabled={isSaving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
              </label>
              <span className="text-sm font-medium text-gray-700">
                {formData.isAvailable ? "Available for rent" : "Not available"}
              </span>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1"
                isLoading={isSaving}
              >
                {isSaving ? "Saving Changes..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/rentor/vehicles")}
                disabled={isSaving}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
