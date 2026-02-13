"use client";

import { useState, FormEvent } from "react";
import { Card, Button, Input, Select } from "@/components/ui";
import { toast } from "react-hot-toast";
import { cityList } from "@/constants/menuLinks";

export interface AddVehicleModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const categories = ["Sedan", "SUV", "Truck", "Van", "Hatchback", "Coupe"];
const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid"];
const transmissions = ["Manual", "Automatic", "Semi-Automatic"];

export function AddVehicleModal({ onClose, onSuccess }: AddVehicleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    category: "Sedan",
    seatingCapacity: "4",
    fuelType: "Petrol",
    transmission: "Automatic",
    pricePerDay: "",
    location: cityList[0],
    description: "",
    imageUrl: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
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

      // Simulate API call to add vehicle
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success(
        `${formData.brand} ${formData.model} added successfully!`
      );

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Add vehicle error:", error);
      toast.error("Failed to add vehicle. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl my-8 p-8 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center mb-2">
          Add New <span className="text-green-600">Vehicle</span>
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Fill in the details to add a vehicle to your fleet
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={isLoading}
            />
            <Input
              label="Model *"
              type="text"
              name="model"
              placeholder="e.g., Camry"
              value={formData.model}
              onChange={handleChange}
              required
              disabled={isLoading}
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
              disabled={isLoading}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={isLoading}
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
              disabled={isLoading}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuel Type
              </label>
              <select
                name="fuelType"
                value={formData.fuelType}
                onChange={handleChange}
                disabled={isLoading}
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
                disabled={isLoading}
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
              disabled={isLoading}
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
                disabled={isLoading}
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
              disabled={isLoading}
              rows={3}
              placeholder="Describe your vehicle..."
              className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
          </div>

          <Input
            label="Image URL (Optional)"
            type="url"
            name="imageUrl"
            placeholder="https://..."
            value={formData.imageUrl}
            onChange={handleChange}
            disabled={isLoading}
          />

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> This is a mock implementation. In production,
              this would save the vehicle to the database and upload images.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1"
              isLoading={isLoading}
            >
              {isLoading ? "Adding Vehicle..." : "Add Vehicle"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
