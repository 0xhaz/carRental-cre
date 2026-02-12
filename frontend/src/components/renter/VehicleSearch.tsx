"use client";

import { useState } from "react";
import { Input, Select, Button, Card } from "@/src/components/ui";
import { useVehicleStore, useBookingFlowStore } from "@/src/store";
import { CITIES, VEHICLE_CATEGORIES, FUEL_TYPES, TRANSMISSION_TYPES } from "@/src/lib/constants";

export interface VehicleSearchProps {
  onSearch?: () => void;
  className?: string;
}

export function VehicleSearch({ onSearch, className }: VehicleSearchProps) {
  const { filters, setFilters, resetFilters } = useVehicleStore();
  const { pickupDate, returnDate, pickupLocation, setPickupDate, setReturnDate, setPickupLocation } =
    useBookingFlowStore();

  const [localFilters, setLocalFilters] = useState(filters);

  const handleSearch = () => {
    setFilters(localFilters);
    onSearch?.();
  };

  const handleReset = () => {
    setLocalFilters({});
    resetFilters();
  };

  return (
    <Card className={`p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Your Perfect Ride</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pickup Location */}
        <Select
          label="Pickup Location"
          value={pickupLocation}
          onChange={(e) => {
            setPickupLocation(e.target.value);
            setLocalFilters({ ...localFilters, location: e.target.value });
          }}
          options={[
            { value: "", label: "Select location" },
            ...CITIES.map((city) => ({ value: city, label: city })),
          ]}
        />

        {/* Pickup Date */}
        <Input
          type="date"
          label="Pickup Date"
          value={pickupDate}
          onChange={(e) => setPickupDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
        />

        {/* Return Date */}
        <Input
          type="date"
          label="Return Date"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
          min={pickupDate || new Date().toISOString().split("T")[0]}
        />

        {/* Category */}
        <Select
          label="Category"
          value={localFilters.category || ""}
          onChange={(e) =>
            setLocalFilters({ ...localFilters, category: e.target.value })
          }
          options={[
            { value: "", label: "All Categories" },
            ...VEHICLE_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
          ]}
        />

        {/* Fuel Type */}
        <Select
          label="Fuel Type"
          value={localFilters.fuelType || ""}
          onChange={(e) =>
            setLocalFilters({ ...localFilters, fuelType: e.target.value })
          }
          options={[
            { value: "", label: "All Fuel Types" },
            ...FUEL_TYPES.map((fuel) => ({ value: fuel, label: fuel })),
          ]}
        />

        {/* Transmission */}
        <Select
          label="Transmission"
          value={localFilters.transmission || ""}
          onChange={(e) =>
            setLocalFilters({ ...localFilters, transmission: e.target.value })
          }
          options={[
            { value: "", label: "All Transmissions" },
            ...TRANSMISSION_TYPES.map((trans) => ({ value: trans, label: trans })),
          ]}
        />

        {/* Price Range */}
        <div className="flex gap-2">
          <Input
            type="number"
            label="Min Price"
            placeholder="$0"
            value={localFilters.minPrice?.toString() || ""}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                minPrice: parseInt(e.target.value) || undefined,
              })
            }
          />
          <Input
            type="number"
            label="Max Price"
            placeholder="Any"
            value={localFilters.maxPrice?.toString() || ""}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                maxPrice: parseInt(e.target.value) || undefined,
              })
            }
          />
        </div>

        {/* Search Input */}
        <Input
          type="text"
          label="Search"
          placeholder="Search by brand or model..."
          value={localFilters.search || ""}
          onChange={(e) =>
            setLocalFilters({ ...localFilters, search: e.target.value })
          }
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <Button onClick={handleSearch} className="flex-1">
          Search Vehicles
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Reset Filters
        </Button>
      </div>
    </Card>
  );
}

// Compact search bar for use in headers/nav
export function CompactVehicleSearch() {
  const [search, setSearch] = useState("");
  const { setFilters } = useVehicleStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ search });
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
      <Input
        type="text"
        placeholder="Search vehicles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
