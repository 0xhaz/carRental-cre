"use client";

import { useState } from "react";
import { Button, Card, CardContent, Badge } from "@/src/components/ui";
import { X, SlidersHorizontal } from "lucide-react";

export interface VehicleFilterState {
  search: string;
  category: string[];
  location: string[];
  fuelType: string[];
  transmission: string[];
  priceRange: [number, number];
  seatingCapacity: number[];
  sortBy: string;
}

export interface VehicleFiltersProps {
  filters: VehicleFilterState;
  onFilterChange: (filters: VehicleFilterState) => void;
  onClearFilters: () => void;
  className?: string;
}

const CATEGORIES = ["Sedan", "SUV", "Luxury", "Sports", "Electric"];
const LOCATIONS = ["New York", "Los Angeles", "Chicago", "Houston"];
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid"];
const TRANSMISSIONS = ["Automatic", "Manual", "Semi-Automatic"];
const SEATING_OPTIONS = [2, 4, 5, 7];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
];

export function VehicleFilters({
  filters,
  onFilterChange,
  onClearFilters,
  className = "",
}: VehicleFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = <K extends keyof VehicleFilterState>(
    key: K,
    value: VehicleFilterState[K]
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: "category" | "location" | "fuelType" | "transmission" | "seatingCapacity", value: string | number) => {
    const currentArray = filters[key] as (string | number)[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray as any);
  };

  const hasActiveFilters =
    filters.search ||
    filters.category.length > 0 ||
    filters.location.length > 0 ||
    filters.fuelType.length > 0 ||
    filters.transmission.length > 0 ||
    filters.seatingCapacity.length > 0 ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 1000;

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-gray-600" />
            <h3 className="font-semibold text-lg">Filters</h3>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              Clear All
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Vehicle
          </label>
          <input
            type="text"
            placeholder="Search by brand or model..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Sort By */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter("sortBy", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle for Advanced Filters */}
        <Button
          variant="outline"
          className="w-full mb-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Hide" : "Show"} Advanced Filters
        </Button>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="space-y-6 border-t pt-4">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range (per day)
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={filters.priceRange[1]}
                  onChange={(e) =>
                    updateFilter("priceRange", [
                      filters.priceRange[0],
                      parseInt(e.target.value),
                    ])
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>${filters.priceRange[0]}</span>
                  <span>${filters.priceRange[1]}</span>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <Badge
                    key={category}
                    variant={
                      filters.category.includes(category) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("category", category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="flex flex-wrap gap-2">
                {LOCATIONS.map((location) => (
                  <Badge
                    key={location}
                    variant={
                      filters.location.includes(location) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("location", location)}
                  >
                    {location}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fuel Type
              </label>
              <div className="flex flex-wrap gap-2">
                {FUEL_TYPES.map((fuel) => (
                  <Badge
                    key={fuel}
                    variant={
                      filters.fuelType.includes(fuel) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("fuelType", fuel)}
                  >
                    {fuel}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Transmission */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transmission
              </label>
              <div className="flex flex-wrap gap-2">
                {TRANSMISSIONS.map((trans) => (
                  <Badge
                    key={trans}
                    variant={
                      filters.transmission.includes(trans) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("transmission", trans)}
                  >
                    {trans}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Seating Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seating Capacity
              </label>
              <div className="flex flex-wrap gap-2">
                {SEATING_OPTIONS.map((seats) => (
                  <Badge
                    key={seats}
                    variant={
                      filters.seatingCapacity.includes(seats)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter("seatingCapacity", seats)}
                  >
                    {seats} seats
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Active Filter Chips - Shows selected filters with remove option
 */
export interface ActiveFiltersProps {
  filters: VehicleFilterState;
  onRemoveFilter: (key: keyof VehicleFilterState, value?: string | number) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilters({
  filters,
  onRemoveFilter,
  onClearAll,
  className = "",
}: ActiveFiltersProps) {
  const chips: Array<{ label: string; key: keyof VehicleFilterState; value?: string | number }> = [];

  if (filters.search) {
    chips.push({ label: `Search: "${filters.search}"`, key: "search" });
  }

  filters.category.forEach((cat) => {
    chips.push({ label: cat, key: "category", value: cat });
  });

  filters.location.forEach((loc) => {
    chips.push({ label: loc, key: "location", value: loc });
  });

  filters.fuelType.forEach((fuel) => {
    chips.push({ label: fuel, key: "fuelType", value: fuel });
  });

  filters.transmission.forEach((trans) => {
    chips.push({ label: trans, key: "transmission", value: trans });
  });

  filters.seatingCapacity.forEach((seats) => {
    chips.push({ label: `${seats} seats`, key: "seatingCapacity", value: seats });
  });

  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) {
    chips.push({
      label: `$${filters.priceRange[0]} - $${filters.priceRange[1]}`,
      key: "priceRange",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-sm text-gray-600">Active Filters:</span>
      {chips.map((chip, index) => (
        <Badge key={index} variant="default" className="gap-1">
          {chip.label}
          <button
            onClick={() => onRemoveFilter(chip.key, chip.value)}
            className="ml-1 hover:bg-white/20 rounded-full p-0.5"
          >
            <X size={14} />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll}>
        Clear All
      </Button>
    </div>
  );
}
