"use client";

import { useState, FormEvent, useEffect } from "react";
import { Card, Button, Input } from "@/src/components/ui";
import { toast } from "react-hot-toast";
import { Vehicle } from "@/src/types";
import { generateMockVehicles } from "@/src/lib/mockData";

export interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [formData, setFormData] = useState({
    vehicleId: "",
    targetAmount: "",
    expectedROI: "12",
    duration: "365",
    minInvestment: "100",
    description: "",
  });

  useEffect(() => {
    // Load vehicles without active fundraising
    const mockVehicles = generateMockVehicles(10);
    const availableVehicles = mockVehicles.filter((v) => !v.fundraising?.active);
    setVehicles(availableVehicles);

    if (availableVehicles.length > 0) {
      setFormData((prev) => ({ ...prev, vehicleId: availableVehicles[0]._id }));
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (!formData.vehicleId) {
        toast.error("Please select a vehicle");
        return;
      }

      const targetAmount = parseFloat(formData.targetAmount);
      if (isNaN(targetAmount) || targetAmount <= 0) {
        toast.error("Please enter a valid target amount");
        return;
      }

      const expectedROI = parseFloat(formData.expectedROI);
      if (isNaN(expectedROI) || expectedROI <= 0 || expectedROI > 100) {
        toast.error("Expected ROI must be between 0 and 100%");
        return;
      }

      const duration = parseInt(formData.duration);
      if (isNaN(duration) || duration < 30 || duration > 1095) {
        toast.error("Duration must be between 30 and 1095 days");
        return;
      }

      const minInvestment = parseFloat(formData.minInvestment);
      if (isNaN(minInvestment) || minInvestment <= 0) {
        toast.error("Please enter a valid minimum investment");
        return;
      }

      // Simulate API call to create campaign
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);
      toast.success(
        `Fundraising campaign created for ${selectedVehicle?.brand} ${selectedVehicle?.model}!`
      );

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Create campaign error:", error);
      toast.error("Failed to create campaign. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);

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
          Create <span className="text-green-600">Fundraising Campaign</span>
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Raise funds for your vehicle through tokenized investment
        </p>

        {vehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              You don't have any vehicles available for fundraising.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              All your vehicles already have active campaigns or you haven't added any vehicles yet.
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vehicle Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Vehicle *
              </label>
              <select
                name="vehicleId"
                value={formData.vehicleId}
                onChange={handleChange}
                disabled={isLoading}
                required
                className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.brand} {vehicle.model} ({vehicle.year}) - ${vehicle.pricePerDay}/day
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedVehicle.category} · {selectedVehicle.location} · {selectedVehicle.seatingCapacity} seats
                </p>
              )}
            </div>

            {/* Campaign Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Target Amount ($) *"
                type="number"
                name="targetAmount"
                placeholder="0.00"
                value={formData.targetAmount}
                onChange={handleChange}
                required
                disabled={isLoading}
                min="0"
                step="0.01"
              />
              <Input
                label="Expected ROI (%) *"
                type="number"
                name="expectedROI"
                value={formData.expectedROI}
                onChange={handleChange}
                required
                disabled={isLoading}
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Campaign Duration (days) *"
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                disabled={isLoading}
                min="30"
                max="1095"
              />
              <Input
                label="Minimum Investment ($) *"
                type="number"
                name="minInvestment"
                value={formData.minInvestment}
                onChange={handleChange}
                required
                disabled={isLoading}
                min="0"
                step="0.01"
              />
            </div>

            {/* Campaign Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isLoading}
                rows={4}
                placeholder="Describe why you're raising funds, how they'll be used, and what returns investors can expect..."
                className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Estimated Returns */}
            {formData.targetAmount && formData.expectedROI && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-900 mb-2">
                  Estimated Annual Returns:
                </p>
                <p className="text-2xl font-bold text-green-700">
                  ${(parseFloat(formData.targetAmount) * parseFloat(formData.expectedROI) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Based on {formData.expectedROI}% ROI on ${parseFloat(formData.targetAmount || 0).toLocaleString()}
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>How it works:</strong> Investors purchase asset tokens representing fractional ownership.
                Funds are released based on milestones. Revenue from rentals is distributed proportionally to token holders.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> This is a mock implementation. In production, this would create
                smart contracts and deploy the campaign on the blockchain.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <Button type="submit" className="flex-1" isLoading={isLoading}>
                {isLoading ? "Creating Campaign..." : "Create Campaign"}
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
        )}
      </Card>
    </div>
  );
}
