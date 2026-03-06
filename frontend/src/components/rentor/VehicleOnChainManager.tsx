"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Input, Badge, Separator } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useVehicleExists,
  useOnChainVehicleStatus,
  useVehicleMetadata,
  useVehicleInfo,
  useLinkedTokens,
  useMaintenanceHistory,
  useIncidentHistory,
  useMintVehicle,
  useLinkTokens,
  useUpdateMileage,
  useRecordMaintenance,
  useRecordIncident,
  useResolveIncident,
  useUpdateMetadataField,
  VEHICLE_STATUS_LABELS,
} from "@/hooks/useVehicleData";
import { parseEther, formatEther } from "viem";
import { toast } from "react-hot-toast";

interface VehicleOnChainManagerProps {
  vehicleNftId?: bigint;
  ownerAddress?: `0x${string}`;
}

export default function VehicleOnChainManager({ vehicleNftId, ownerAddress }: VehicleOnChainManagerProps) {
  const [tab, setTab] = useState<"mileage" | "maintenance" | "incidents" | "metadata" | "mint">("mileage");

  const { data: exists } = useVehicleExists(vehicleNftId);
  const { data: statusData } = useOnChainVehicleStatus(vehicleNftId);
  const { data: metadata } = useVehicleMetadata(vehicleNftId);
  const { data: vehicleInfo } = useVehicleInfo(vehicleNftId);
  const { data: linkedTokens } = useLinkedTokens(vehicleNftId);
  const { data: maintenanceData } = useMaintenanceHistory(vehicleNftId);
  const { data: incidentData } = useIncidentHistory(vehicleNftId);

  // Mint form
  const [mintTo, setMintTo] = useState(ownerAddress || "");
  const [mintVin, setMintVin] = useState("");
  const [mintMake, setMintMake] = useState("");
  const [mintModel, setMintModel] = useState("");
  const [mintYear, setMintYear] = useState("");
  const [mintColor, setMintColor] = useState("");
  const [mintMileage, setMintMileage] = useState("0");
  const [mintAsset, setMintAsset] = useState("");
  const [mintRevenue, setMintRevenue] = useState("");
  const [mintRegExpiry, setMintRegExpiry] = useState("");
  const [mintInsExpiry, setMintInsExpiry] = useState("");

  // Mileage form
  const [newMileage, setNewMileage] = useState("");

  // Maintenance form
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState("");

  // Incident form
  const [incDesc, setIncDesc] = useState("");
  const [incCost, setIncCost] = useState("");
  const [incBookingId, setIncBookingId] = useState("");

  // Resolve incident form
  const [resolveId, setResolveId] = useState("");
  const [resolveActual, setResolveActual] = useState("");

  // Metadata form
  const [metaField, setMetaField] = useState("");
  const [metaValue, setMetaValue] = useState("");

  // Link tokens form
  const [linkAsset, setLinkAsset] = useState("");
  const [linkRevenue, setLinkRevenue] = useState("");

  const mintVehicle = useMintVehicle();
  const updateMileage = useUpdateMileage();
  const recordMaintenance = useRecordMaintenance();
  const recordIncident = useRecordIncident();
  const resolveIncident = useResolveIncident();
  const updateMetadata = useUpdateMetadataField();
  const linkTokens = useLinkTokens();

  useEffect(() => { if (mintVehicle.isSuccess) toast.success("Vehicle NFT minted!"); }, [mintVehicle.isSuccess]);
  useEffect(() => { if (updateMileage.isSuccess) { toast.success("Mileage updated!"); setNewMileage(""); } }, [updateMileage.isSuccess]);
  useEffect(() => { if (recordMaintenance.isSuccess) { toast.success("Maintenance recorded!"); setMaintDesc(""); setMaintCost(""); } }, [recordMaintenance.isSuccess]);
  useEffect(() => { if (recordIncident.isSuccess) { toast.success("Incident recorded!"); setIncDesc(""); } }, [recordIncident.isSuccess]);
  useEffect(() => { if (resolveIncident.isSuccess) toast.success("Incident resolved!"); }, [resolveIncident.isSuccess]);
  useEffect(() => { if (updateMetadata.isSuccess) toast.success("Metadata updated!"); }, [updateMetadata.isSuccess]);
  useEffect(() => { if (linkTokens.isSuccess) toast.success("Tokens linked!"); }, [linkTokens.isSuccess]);

  const statusNum = statusData !== undefined ? Number(statusData) : undefined;
  const meta = metadata as any;
  const info = vehicleInfo as any;
  const tokens = linkedTokens as [`0x${string}`, `0x${string}`] | undefined;
  const maintenanceRecords = (maintenanceData as any[]) || [];
  const incidentRecords = (incidentData as any[]) || [];

  if (!exists && vehicleNftId !== undefined) {
    return (
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">Mint Vehicle NFT</Heading>
          <p className="text-sm text-gray-600 mb-4">Vehicle #{vehicleNftId?.toString()} is not yet minted on-chain.</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Input label="To Address" value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="0x..." />
            <Input label="VIN" value={mintVin} onChange={(e) => setMintVin(e.target.value)} placeholder="VIN number" />
            <Input label="Make" value={mintMake} onChange={(e) => setMintMake(e.target.value)} placeholder="BMW" />
            <Input label="Model" value={mintModel} onChange={(e) => setMintModel(e.target.value)} placeholder="X5" />
            <Input label="Year" type="number" value={mintYear} onChange={(e) => setMintYear(e.target.value)} placeholder="2024" />
            <Input label="Color" value={mintColor} onChange={(e) => setMintColor(e.target.value)} placeholder="Black" />
            <Input label="Registration Expiry" type="date" value={mintRegExpiry} onChange={(e) => setMintRegExpiry(e.target.value)} />
            <Input label="Insurance Expiry" type="date" value={mintInsExpiry} onChange={(e) => setMintInsExpiry(e.target.value)} />
            <Input label="AssetToken" value={mintAsset} onChange={(e) => setMintAsset(e.target.value)} placeholder="0x..." />
            <Input label="RevenueToken" value={mintRevenue} onChange={(e) => setMintRevenue(e.target.value)} placeholder="0x..." />
          </div>
          <Button
            onClick={() => mintVehicle.mintVehicle(
              mintTo as `0x${string}`,
              { vin: mintVin, make: mintMake, model: mintModel, year: BigInt(mintYear || "0"), color: mintColor, mileage: BigInt(mintMileage || "0"), registrationExpiry: mintRegExpiry ? BigInt(Math.floor(new Date(mintRegExpiry).getTime() / 1000)) : BigInt(0), insuranceExpiry: mintInsExpiry ? BigInt(Math.floor(new Date(mintInsExpiry).getTime() / 1000)) : BigInt(0) },
              mintAsset as `0x${string}`,
              mintRevenue as `0x${string}`,
            )}
            disabled={mintVehicle.isPending || mintVehicle.isConfirming}
            className="w-full"
          >
            {mintVehicle.isPending ? "Confirm..." : mintVehicle.isConfirming ? "Minting..." : "Mint Vehicle NFT"}
          </Button>
          {mintVehicle.hash && <ExplorerLink value={mintVehicle.hash} type="tx" label="View tx" className="text-xs mt-2" />}
        </CardContent>
      </Card>
    );
  }

  const tabs = ["mileage", "maintenance", "incidents", "metadata"] as const;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Heading as="h3">On-Chain Vehicle Manager {vehicleNftId !== undefined ? `#${vehicleNftId.toString()}` : ""}</Heading>
          {statusNum !== undefined && (
            <Badge variant={statusNum === 0 ? "success" : statusNum === 2 ? "warning" : "default"}>
              {VEHICLE_STATUS_LABELS[statusNum] || `Status ${statusNum}`}
            </Badge>
          )}
        </div>

        {/* Overview */}
        {meta && (
          <div className="grid grid-cols-3 gap-3 text-sm mb-4">
            <div><span className="text-gray-500">VIN</span><p className="font-mono text-xs">{meta.vin || meta[0]}</p></div>
            <div><span className="text-gray-500">Mileage</span><p>{Number(meta.mileage ?? meta[5] ?? 0).toLocaleString()} km</p></div>
            <div><span className="text-gray-500">Year</span><p>{Number(meta.year ?? meta[3] ?? 0)}</p></div>
          </div>
        )}

        {tokens && (
          <div className="flex gap-3 mb-4 text-xs">
            {tokens[0] !== "0x0000000000000000000000000000000000000000" && <ExplorerLink value={tokens[0]} type="address" label="AssetToken" />}
            {tokens[1] !== "0x0000000000000000000000000000000000000000" && <ExplorerLink value={tokens[1]} type="address" label="RevenueToken" />}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {tabs.map(t => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>

        {/* Mileage Tab */}
        {tab === "mileage" && vehicleNftId !== undefined && (
          <div className="space-y-3">
            <Input type="number" label="New Mileage (km)" value={newMileage} onChange={(e) => setNewMileage(e.target.value)} placeholder="50000" />
            <Button onClick={() => updateMileage.updateMileage(vehicleNftId, BigInt(newMileage))} disabled={updateMileage.isPending || updateMileage.isConfirming || !newMileage} className="w-full">
              {updateMileage.isPending ? "Confirm..." : "Update Mileage"}
            </Button>

            <Separator className="my-4" />
            <p className="text-sm font-medium">Link Tokens</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="AssetToken" value={linkAsset} onChange={(e) => setLinkAsset(e.target.value)} placeholder="0x..." />
              <Input label="RevenueToken" value={linkRevenue} onChange={(e) => setLinkRevenue(e.target.value)} placeholder="0x..." />
            </div>
            <Button onClick={() => linkTokens.linkTokens(vehicleNftId, linkAsset as `0x${string}`, linkRevenue as `0x${string}`)} disabled={linkTokens.isPending || linkTokens.isConfirming || !linkAsset || !linkRevenue} className="w-full" variant="outline">
              Link Tokens
            </Button>
          </div>
        )}

        {/* Maintenance Tab */}
        {tab === "maintenance" && vehicleNftId !== undefined && (
          <div className="space-y-3">
            <Input label="Description" value={maintDesc} onChange={(e) => setMaintDesc(e.target.value)} placeholder="Oil change..." />
            <Input type="number" label="Cost (ETH)" value={maintCost} onChange={(e) => setMaintCost(e.target.value)} placeholder="0.01" min={0} step="0.001" />
            <Button onClick={() => recordMaintenance.recordMaintenance(vehicleNftId, maintDesc, parseEther(maintCost || "0"))} disabled={recordMaintenance.isPending || recordMaintenance.isConfirming || !maintDesc} className="w-full">
              Record Maintenance
            </Button>

            {maintenanceRecords.length > 0 && (
              <>
                <Separator className="my-4" />
                <p className="text-sm font-medium">History ({maintenanceRecords.length})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {maintenanceRecords.map((r: any, i: number) => (
                    <div key={i} className="text-xs p-2 bg-gray-50 rounded">
                      <p>{r.description || r[0]}</p>
                      <p className="text-gray-500">Cost: {r.cost ? formatEther(r.cost) : r[1] ? formatEther(r[1]) : "—"} ETH</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Incidents Tab */}
        {tab === "incidents" && vehicleNftId !== undefined && (
          <div className="space-y-3">
            <Input label="Description" value={incDesc} onChange={(e) => setIncDesc(e.target.value)} placeholder="Fender bender..." />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" label="Estimated Cost (ETH)" value={incCost} onChange={(e) => setIncCost(e.target.value)} placeholder="0.1" />
              <Input type="number" label="Booking ID" value={incBookingId} onChange={(e) => setIncBookingId(e.target.value)} placeholder="1" />
            </div>
            <Button onClick={() => recordIncident.recordIncident(vehicleNftId, incDesc, parseEther(incCost || "0"), BigInt(incBookingId || "0"))} disabled={recordIncident.isPending || recordIncident.isConfirming || !incDesc} className="w-full">
              Record Incident
            </Button>

            <Separator className="my-4" />
            <p className="text-sm font-medium">Resolve Incident</p>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" label="Incident Index" value={resolveId} onChange={(e) => setResolveId(e.target.value)} placeholder="0" />
              <Input type="number" label="Actual Cost (ETH)" value={resolveActual} onChange={(e) => setResolveActual(e.target.value)} placeholder="0.05" />
            </div>
            <Button variant="outline" onClick={() => resolveIncident.resolveIncident(vehicleNftId, BigInt(resolveId || "0"), parseEther(resolveActual || "0"))} disabled={resolveIncident.isPending || resolveIncident.isConfirming} className="w-full">
              Resolve Incident
            </Button>

            {incidentRecords.length > 0 && (
              <>
                <Separator className="my-4" />
                <p className="text-sm font-medium">History ({incidentRecords.length})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {incidentRecords.map((r: any, i: number) => (
                    <div key={i} className="text-xs p-2 bg-gray-50 rounded">
                      <p>{r.description || r[0]}</p>
                      <p className="text-gray-500">Est: {r.estimatedCost ? formatEther(r.estimatedCost) : "—"} | Resolved: {r.resolved ? "Yes" : "No"}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Metadata Tab */}
        {tab === "metadata" && vehicleNftId !== undefined && (
          <div className="space-y-3">
            <Input label="Field Name" value={metaField} onChange={(e) => setMetaField(e.target.value)} placeholder="color" />
            <Input label="New Value" value={metaValue} onChange={(e) => setMetaValue(e.target.value)} placeholder="Red" />
            <Button onClick={() => updateMetadata.updateField(vehicleNftId, metaField, metaValue)} disabled={updateMetadata.isPending || updateMetadata.isConfirming || !metaField || !metaValue} className="w-full">
              Update Metadata
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
