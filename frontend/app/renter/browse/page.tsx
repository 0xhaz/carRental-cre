"use client";

import { useState, useEffect } from "react";
import {
  VehicleCard,
  VehicleCardSkeleton,
  VehicleFilters,
  ActiveFilters,
  type VehicleFilterState,
} from "@/src/components/renter";
import { Heading, Paragraph } from "@/src/components/ui";
import { generateMockVehicles } from "@/src/lib/mockData";
import { Vehicle } from "@/src/types";

const DEFAULT_FILTERS: VehicleFilterState = {
  search: "",
  category: [],
  location: [],
  fuelType: [],
  transmission: [],
  priceRange: [0, 1000],
  seatingCapacity: [],
  sortBy: "newest",
};

export default function RenterBrowse() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<VehicleFilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockVehicles = generateMockVehicles(20);
      setVehicles(mockVehicles);
      setIsLoading(false);
    };

    loadVehicles();
  }, []);

  // Filter and sort vehicles
  const filteredVehicles = vehicles
    .filter((vehicle) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          vehicle.brand.toLowerCase().includes(searchLower) ||
          vehicle.model.toLowerCase().includes(searchLower) ||
          vehicle.name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category.length > 0 && !filters.category.includes(vehicle.category)) {
        return false;
      }

      // Location filter
      if (filters.location.length > 0 && !filters.location.includes(vehicle.location)) {
        return false;
      }

      // Fuel type filter
      if (filters.fuelType.length > 0 && !filters.fuelType.includes(vehicle.fuel_type)) {
        return false;
      }

      // Transmission filter
      if (
        filters.transmission.length > 0 &&
        !filters.transmission.includes(vehicle.transmission)
      ) {
        return false;
      }

      // Price range filter
      if (
        vehicle.pricePerDay < filters.priceRange[0] ||
        vehicle.pricePerDay > filters.priceRange[1]
      ) {
        return false;
      }

      // Seating capacity filter
      if (
        filters.seatingCapacity.length > 0 &&
        !filters.seatingCapacity.includes(vehicle.seating_capacity)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "price-low":
          return a.pricePerDay - b.pricePerDay;
        case "price-high":
          return b.pricePerDay - a.pricePerDay;
        case "rating":
          // Mock rating - in real app this would come from reviews
          return 0;
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const handleFilterChange = (newFilters: VehicleFilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleRemoveFilter = (
    key: keyof VehicleFilterState,
    value?: string | number
  ) => {
    if (key === "search") {
      setFilters({ ...filters, search: "" });
    } else if (key === "priceRange") {
      setFilters({ ...filters, priceRange: [0, 1000] });
    } else if (value !== undefined) {
      const currentArray = filters[key] as (string | number)[];
      setFilters({
        ...filters,
        [key]: currentArray.filter((item) => item !== value),
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Browse Vehicles
        </Heading>
        <Paragraph className="text-lg">
          Find and book the perfect vehicle for your trip
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <VehicleFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            className="sticky top-4"
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {/* Active Filters */}
          <ActiveFilters
            filters={filters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearFilters}
            className="mb-6"
          />

          {/* Results Count */}
          <div className="flex justify-between items-center mb-6">
            <Heading as="h2">
              {filteredVehicles.length}{" "}
              {filteredVehicles.length === 1 ? "Vehicle" : "Vehicles"} Available
            </Heading>
          </div>

          {/* Vehicle Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <VehicleCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle) => (
                <VehicleCard key={vehicle._id} vehicle={vehicle} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Paragraph className="text-lg text-gray-600">
                No vehicles found matching your criteria.
              </Paragraph>
              <Paragraph className="mt-2 text-sm text-gray-500">
                Try adjusting your filters or search terms.
              </Paragraph>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
