"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VehicleManagementCard, VehicleManagementCardSkeleton, AddVehicleModal } from "@/src/components/rentor";
import { Heading, Paragraph, Button, Badge } from "@/src/components/ui";
import { generateMockVehicles } from "@/src/lib/mockData";
import { Vehicle } from "@/src/types";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function RentorVehicles() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockVehicles = generateMockVehicles(8);
      setVehicles(mockVehicles);
      setIsLoading(false);
    };

    loadVehicles();
  }, []);

  const handleEdit = (vehicleId: string) => {
    toast.info("Edit vehicle feature coming soon!");
    // TODO: Navigate to edit page when implemented
    // router.push(`/rentor/vehicles/edit/${vehicleId}`);
  };

  const handleViewBookings = (vehicleId: string) => {
    // Navigate to bookings page (could add vehicle filter in the future)
    router.push("/rentor/bookings");
  };

  const handleManageFundraising = (vehicleId: string) => {
    // Navigate to fundraising page
    router.push("/rentor/fundraising");
  };

  const availableCount = vehicles.filter((v) => v.isAvailable).length;
  const fundraisingCount = vehicles.filter((v) => v.fundraising?.active).length;

  const handleAddVehicleSuccess = () => {
    // In a real app, this would refetch the vehicles list
    // Simulate refetch
    setTimeout(() => {
      const loadVehicles = async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockVehicles = generateMockVehicles(vehicles.length + 1);
        setVehicles(mockVehicles);
        setIsLoading(false);
      };
      loadVehicles();
    }, 500);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <Heading as="h1" className="mb-2">
              My Vehicles
            </Heading>
            <Paragraph className="text-lg">
              Manage your fleet of vehicles
            </Paragraph>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            Add New Vehicle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-borderColor p-4">
          <p className="text-sm text-gray-600">Total Vehicles</p>
          <p className="text-2xl font-bold text-gray-900">{vehicles.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-borderColor p-4">
          <p className="text-sm text-gray-600">Available</p>
          <p className="text-2xl font-bold text-green-600">{availableCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-borderColor p-4">
          <p className="text-sm text-gray-600">Fundraising Active</p>
          <p className="text-2xl font-bold text-blue-600">{fundraisingCount}</p>
        </div>
      </div>

      {/* Vehicles List */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Heading as="h2">Fleet Overview</Heading>
          <Badge variant="default">{vehicles.length} Vehicles</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <VehicleManagementCardSkeleton key={i} />
            ))}
          </div>
        ) : vehicles.length > 0 ? (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <VehicleManagementCard
                key={vehicle._id}
                vehicle={vehicle}
                onEdit={handleEdit}
                onViewBookings={handleViewBookings}
                onManageFundraising={handleManageFundraising}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Paragraph className="text-lg text-gray-600">
              You haven't added any vehicles yet.
            </Paragraph>
            <Paragraph className="mt-2 text-sm text-gray-500">
              Add your first vehicle to start earning.
            </Paragraph>
            <Button
              className="mt-4"
              onClick={() => setShowAddModal(true)}
            >
              Add Your First Vehicle
            </Button>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <AddVehicleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddVehicleSuccess}
        />
      )}
    </div>
  );
}
