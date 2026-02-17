"use client";

import { useState } from "react";
import { Card, CardContent, Heading, Button, Input } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import { useCreatePreRentalReport, useCreatePostRentalReport } from "@/hooks/useRentalOperations";
import { toast } from "react-hot-toast";

export interface ConditionReportFormProps {
  bookingId: bigint;
  vehicleId: bigint;
  type: "pre" | "post";
  onComplete?: (hash: string) => void;
}

export function ConditionReportForm({
  bookingId,
  vehicleId,
  type,
  onComplete,
}: ConditionReportFormProps) {
  const [mileage, setMileage] = useState("");
  const [fuelLevel, setFuelLevel] = useState("100");
  const [photoHashes, setPhotoHashes] = useState<string[]>([""]);
  const [damageNotes, setDamageNotes] = useState<string[]>([""]);

  const preReport = useCreatePreRentalReport();
  const postReport = useCreatePostRentalReport();
  const report = type === "pre" ? preReport : postReport;

  const handleSubmit = () => {
    const mileageVal = BigInt(mileage || "0");
    const fuelVal = parseInt(fuelLevel) || 0;

    if (fuelVal < 0 || fuelVal > 100) {
      toast.error("Fuel level must be between 0 and 100");
      return;
    }

    const validHashes = photoHashes
      .filter((h) => h.trim())
      .map((h) => (h.startsWith("0x") ? h : `0x${h}`) as `0x${string}`);

    const validNotes = damageNotes.filter((n) => n.trim());

    report.createReport(
      bookingId,
      vehicleId,
      mileageVal,
      fuelVal,
      validHashes,
      validNotes,
    );
  };

  if (report.isSuccess && report.hash) {
    onComplete?.(report.hash);
  }

  const addPhotoHash = () => setPhotoHashes([...photoHashes, ""]);
  const removePhotoHash = (i: number) =>
    setPhotoHashes(photoHashes.filter((_, idx) => idx !== i));
  const updatePhotoHash = (i: number, val: string) =>
    setPhotoHashes(photoHashes.map((h, idx) => (idx === i ? val : h)));

  const addDamageNote = () => setDamageNotes([...damageNotes, ""]);
  const removeDamageNote = (i: number) =>
    setDamageNotes(damageNotes.filter((_, idx) => idx !== i));
  const updateDamageNote = (i: number, val: string) =>
    setDamageNotes(damageNotes.map((n, idx) => (idx === i ? val : n)));

  const title = type === "pre" ? "Pre-Rental Condition Report" : "Post-Rental Condition Report";

  return (
    <Card>
      <CardContent className="p-6">
        <Heading as="h3" className="mb-4">
          {title}
        </Heading>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mileage (km)
              </label>
              <Input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="e.g. 45230"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuel Level (0-100%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                placeholder="e.g. 85"
              />
            </div>
          </div>

          {/* Photo Hashes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Photo Hashes (IPFS)
              </label>
              <Button size="sm" variant="outline" onClick={addPhotoHash}>
                + Add
              </Button>
            </div>
            <div className="space-y-2">
              {photoHashes.map((hash, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={hash}
                    onChange={(e) => updatePhotoHash(i, e.target.value)}
                    placeholder="0x... (bytes32 IPFS hash)"
                    className="flex-1 font-mono text-xs"
                  />
                  {photoHashes.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removePhotoHash(i)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Damage Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Damage Notes
              </label>
              <Button size="sm" variant="outline" onClick={addDamageNote}>
                + Add
              </Button>
            </div>
            <div className="space-y-2">
              {damageNotes.map((note, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => updateDamageNote(i, e.target.value)}
                    placeholder="Describe any existing damage..."
                    className="flex-1"
                  />
                  {damageNotes.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeDamageNote(i)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {report.error && (
            <p className="text-sm text-red-600">
              Error: {(report.error as Error).message?.slice(0, 100)}
            </p>
          )}

          {report.hash && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span>Tx:</span>
              <ExplorerLink value={report.hash} type="tx" />
              {report.isConfirming && <span className="text-gray-500">(confirming...)</span>}
              {report.isSuccess && <span>(confirmed)</span>}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={report.isPending || report.isConfirming || !mileage}
            className="w-full"
          >
            {report.isPending
              ? "Confirm in Wallet..."
              : report.isConfirming
                ? "Confirming..."
                : `Submit ${type === "pre" ? "Pre" : "Post"}-Rental Report`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
