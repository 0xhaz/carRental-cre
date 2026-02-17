"use client";

import { useState } from "react";
import { Heading, Paragraph, Card, CardContent, Input, Button } from "@/components/ui";
import RevenueAdmin from "@/components/admin/RevenueAdmin";

export default function AdminRevenuePage() {
  const [vehicleIdInput, setVehicleIdInput] = useState("");
  const [activeVehicleId, setActiveVehicleId] = useState<bigint | null>(null);

  const handleLookup = () => {
    const id = parseInt(vehicleIdInput);
    if (isNaN(id) || id < 0) return;
    setActiveVehicleId(BigInt(id));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Revenue Management
        </Heading>
        <Paragraph>
          Add and distribute revenue for vehicles. Revenue flows through the waterfall to token holders.
        </Paragraph>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
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
        <RevenueAdmin vehicleId={activeVehicleId} />
      )}
    </div>
  );
}
