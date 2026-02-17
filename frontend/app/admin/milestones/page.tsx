"use client";

import { useState, useEffect } from "react";
import { Heading, Paragraph, Card, CardContent, Input, Button, Badge } from "@/components/ui";
import MilestoneManagement from "@/components/admin/MilestoneManagement";
import VehicleSetupWizard from "@/components/rentor/VehicleSetupWizard";
import { vehicleApi } from "@/lib/api";
import { Vehicle } from "@/types";
import { toast } from "react-hot-toast";

export default function AdminMilestonesPage() {
  const [vehicleIdInput, setVehicleIdInput] = useState("");
  const [activeVehicleId, setActiveVehicleId] = useState<bigint | null>(null);
  const [vehicleDbId, setVehicleDbId] = useState<string | undefined>();

  // Pending token registrations
  const [pendingVehicles, setPendingVehicles] = useState<Vehicle[]>([]);
  const [isPendingLoading, setIsPendingLoading] = useState(true);
  const [activeRegistration, setActiveRegistration] = useState<string | null>(null);

  useEffect(() => {
    loadPendingVehicles();
  }, []);

  const loadPendingVehicles = async () => {
    try {
      setIsPendingLoading(true);
      const res = await vehicleApi.getVehiclesPendingRegistration();
      if (res.success) {
        setPendingVehicles(res.data);
      }
    } catch (error) {
      console.error("Failed to load pending registrations:", error);
    } finally {
      setIsPendingLoading(false);
    }
  };

  const handleRegistrationComplete = async (vehicle: Vehicle) => {
    try {
      await vehicleApi.completeTokenRegistration(vehicle._id);
      toast.success(`Registration complete for ${vehicle.brand} ${vehicle.model}. Rentor notified.`);
      setPendingVehicles((prev) => prev.filter((v) => v._id !== vehicle._id));
      setActiveRegistration(null);
    } catch (error) {
      console.error("Failed to complete registration:", error);
      toast.error("Failed to send completion notification");
    }
  };

  const handleLookup = async () => {
    const id = parseInt(vehicleIdInput);
    if (isNaN(id) || id < 0) return;
    setActiveVehicleId(BigInt(id));
    // Also look up the DB record to get _id for milestone documents
    try {
      const res = await vehicleApi.getByNftId(id);
      if (res.success && res.data) {
        setVehicleDbId(res.data._id);
      } else {
        setVehicleDbId(undefined);
      }
    } catch {
      setVehicleDbId(undefined);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Milestone Management
        </Heading>
        <Paragraph>
          Complete milestones for vehicle investments to release funds and mint tokens.
        </Paragraph>
      </div>

      {/* Pending Token Registrations */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading as="h2">
              Pending Token Registrations
            </Heading>
            {pendingVehicles.length > 0 && (
              <Badge variant="warning">{pendingVehicles.length} pending</Badge>
            )}
          </div>
          <Paragraph className="text-sm text-gray-600 mb-4">
            Vehicles with deployed tokens that need on-chain registration. Connect the admin wallet to process these.
          </Paragraph>

          {isPendingLoading ? (
            <div className="text-sm text-gray-500 py-4 text-center">Loading pending registrations...</div>
          ) : pendingVehicles.length === 0 ? (
            <div className="text-sm text-gray-500 py-4 text-center">No pending registrations</div>
          ) : (
            <div className="space-y-3">
              {pendingVehicles.map((vehicle) => (
                <div key={vehicle._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {vehicle.brand} {vehicle.model} {vehicle.year}
                      </p>
                      <p className="text-xs text-gray-500">
                        NFT #{vehicle.vehicleNftId}
                      </p>
                    </div>
                    {activeRegistration !== vehicle._id && (
                      <Button
                        size="sm"
                        onClick={() => setActiveRegistration(vehicle._id)}
                      >
                        Start Registration
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div>
                      <span className="text-gray-400">Asset Token: </span>
                      <span className="font-mono">{vehicle.assetTokenAddress?.slice(0, 14)}...</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Revenue Token: </span>
                      <span className="font-mono">{vehicle.revenueTokenAddress?.slice(0, 14)}...</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Rentor Wallet: </span>
                      <span className="font-mono">{vehicle.ownerAddress?.slice(0, 14) || "N/A"}...</span>
                    </div>
                  </div>

                  {activeRegistration === vehicle._id && vehicle.vehicleNftId && vehicle.assetTokenAddress && vehicle.revenueTokenAddress && vehicle.ownerAddress && (
                    <VehicleSetupWizard
                      vehicleNftId={BigInt(vehicle.vehicleNftId)}
                      assetTokenAddress={vehicle.assetTokenAddress as `0x${string}`}
                      revenueTokenAddress={vehicle.revenueTokenAddress as `0x${string}`}
                      rentorAddress={vehicle.ownerAddress as `0x${string}`}
                      vehicleName={`${vehicle.brand} ${vehicle.model}`}
                      onComplete={() => handleRegistrationComplete(vehicle)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestone Lookup */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <Heading as="h2" className="mb-4">Milestone Lookup</Heading>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                type="number"
                label="Vehicle NFT ID"
                placeholder="Enter vehicle token ID"
                value={vehicleIdInput}
                onChange={(e) => setVehicleIdInput(e.target.value)}
                min={0}
              />
            </div>
            <Button onClick={handleLookup} disabled={!vehicleIdInput}>
              Look Up
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeVehicleId !== null && (
        <MilestoneManagement vehicleId={activeVehicleId} vehicleDbId={vehicleDbId} />
      )}
    </div>
  );
}
