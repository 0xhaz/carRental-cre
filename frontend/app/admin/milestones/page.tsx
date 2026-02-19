"use client";

import { useState, useEffect } from "react";
import { Heading, Paragraph, Card, CardContent, Input, Button, Badge } from "@/components/ui";
import MilestoneManagement from "@/components/admin/MilestoneManagement";
import VehicleSetupWizard from "@/components/rentor/VehicleSetupWizard";
import { vehicleApi } from "@/lib/api";
import { Vehicle } from "@/types";
import { toast } from "react-hot-toast";
import { useSetRevenueTokenDistributor, useIsTokenAgent, useAddTokenAgent, useVehicleTokenAddresses } from "@/hooks/useVehicleSetup";
import { useReadContract } from "wagmi";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl, SEPOLIA_CONTRACTS } from "@/constants/contracts";

export default function AdminMilestonesPage() {
  const [vehicleIdInput, setVehicleIdInput] = useState("");
  const [activeVehicleId, setActiveVehicleId] = useState<bigint | null>(null);
  const [vehicleDbId, setVehicleDbId] = useState<string | undefined>();

  // Revenue Token fix utility
  const [fixTokenAddress, setFixTokenAddress] = useState("");
  const {
    setDistributor,
    hash: fixHash,
    isConfirming: isFixConfirming,
    isSuccess: fixSuccess,
    isPending: isFixPending,
    error: fixError,
  } = useSetRevenueTokenDistributor();

  const fixTokenAddr = fixTokenAddress.startsWith("0x") && fixTokenAddress.length === 42
    ? (fixTokenAddress as `0x${string}`)
    : undefined;

  const { data: currentDistributor } = useReadContract({
    address: fixTokenAddr,
    abi: [{ type: "function", name: "revenueDistributor", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }] as const,
    functionName: "revenueDistributor",
    query: { enabled: !!fixTokenAddr },
  });

  const distributorConfigured = currentDistributor &&
    (currentDistributor as string).toLowerCase() === SEPOLIA_CONTRACTS.revenueDistributor.toLowerCase();

  useEffect(() => {
    if (fixSuccess) {
      toast.success("RevenueToken distributor configured successfully!");
    }
  }, [fixSuccess]);

  useEffect(() => {
    if (fixError) {
      toast.error(fixError.message?.slice(0, 100) || "Failed to set distributor");
    }
  }, [fixError]);

  // Authorize minting agent utility — lookup by Vehicle NFT ID
  const [agentVehicleIdInput, setAgentVehicleIdInput] = useState("");
  const [agentVehicleId, setAgentVehicleId] = useState<bigint | undefined>();
  const paymentProtocolAddress = SEPOLIA_CONTRACTS.investmentPaymentProtocol as `0x${string}`;

  const { assetToken: agentAssetToken, revenueToken: agentRevenueToken } = useVehicleTokenAddresses(agentVehicleId);
  const { data: isAssetAgent } = useIsTokenAgent(agentAssetToken, paymentProtocolAddress);
  const { data: isRevenueAgent } = useIsTokenAgent(agentRevenueToken, paymentProtocolAddress);

  const {
    addAgent: addAgentAsset,
    hash: agentAssetHash,
    isConfirming: isAgentAssetConfirming,
    isSuccess: agentAssetSuccess,
    isPending: isAgentAssetPending,
    error: agentAssetError,
  } = useAddTokenAgent();

  const {
    addAgent: addAgentRevenue,
    hash: agentRevenueHash,
    isConfirming: isAgentRevenueConfirming,
    isSuccess: agentRevenueSuccess,
    isPending: isAgentRevenuePending,
    error: agentRevenueError,
  } = useAddTokenAgent();

  useEffect(() => {
    if (agentAssetSuccess) toast.success("AssetToken: PaymentProtocol authorized as minting agent!");
  }, [agentAssetSuccess]);

  useEffect(() => {
    if (agentRevenueSuccess) toast.success("RevenueToken: PaymentProtocol authorized as minting agent!");
  }, [agentRevenueSuccess]);

  useEffect(() => {
    if (agentAssetError) toast.error(agentAssetError.message?.slice(0, 100) || "Failed to add agent on AssetToken");
  }, [agentAssetError]);

  useEffect(() => {
    if (agentRevenueError) toast.error(agentRevenueError.message?.slice(0, 100) || "Failed to add agent on RevenueToken");
  }, [agentRevenueError]);

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
      // Pass the token addresses used during registration to sync DB with on-chain state
      await vehicleApi.completeTokenRegistration(
        vehicle._id,
        vehicle.assetTokenAddress || undefined,
        vehicle.revenueTokenAddress || undefined,
      );
      toast.success(`Registration complete for ${vehicle.brand} ${vehicle.model}. Rentor notified.`);
      setPendingVehicles((prev) => prev.filter((v) => v._id !== vehicle._id));
      setActiveRegistration(null);
    } catch (error) {
      console.error("Failed to complete registration:", error);
      toast.error("Failed to send completion notification");
    }
  };

  // Sync Token Addresses utility — read on-chain, update DB
  const [syncNftIdInput, setSyncNftIdInput] = useState("");
  const [syncNftId, setSyncNftId] = useState<bigint | undefined>();
  const [syncDbVehicle, setSyncDbVehicle] = useState<Vehicle | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { assetToken: syncAssetToken, revenueToken: syncRevenueToken } = useVehicleTokenAddresses(syncNftId);

  const handleSyncLookup = async () => {
    const id = parseInt(syncNftIdInput);
    if (isNaN(id) || id < 0) return;
    setSyncNftId(BigInt(id));
    try {
      const res = await vehicleApi.getByNftId(id);
      if (res.success && res.data) {
        setSyncDbVehicle(res.data);
      } else {
        setSyncDbVehicle(null);
      }
    } catch {
      setSyncDbVehicle(null);
    }
  };

  const dbAssetMismatch = syncDbVehicle && syncAssetToken &&
    syncDbVehicle.assetTokenAddress?.toLowerCase() !== syncAssetToken.toLowerCase();
  const dbRevenueMismatch = syncDbVehicle && syncRevenueToken &&
    syncDbVehicle.revenueTokenAddress?.toLowerCase() !== syncRevenueToken.toLowerCase();
  const hasAnyMismatch = dbAssetMismatch || dbRevenueMismatch;

  const handleSyncAddresses = async () => {
    if (!syncDbVehicle || !syncAssetToken || !syncRevenueToken) return;
    setIsSyncing(true);
    try {
      await vehicleApi.syncTokenAddresses(syncDbVehicle._id, syncAssetToken, syncRevenueToken);
      toast.success("Token addresses synced to database!");
      setSyncDbVehicle((prev) => prev ? {
        ...prev,
        assetTokenAddress: syncAssetToken,
        revenueTokenAddress: syncRevenueToken,
      } : null);
    } catch (error) {
      console.error("Failed to sync token addresses:", error);
      toast.error("Failed to sync token addresses");
    } finally {
      setIsSyncing(false);
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

      {/* Fix Revenue Token Distributor */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <Heading as="h2" className="mb-2">Fix Revenue Token Distributor</Heading>
          <Paragraph className="text-sm text-gray-600 mb-4">
            If investors can&apos;t claim revenue, the RevenueToken may need its distributor configured.
          </Paragraph>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Revenue Token Address"
                placeholder="0x..."
                value={fixTokenAddress}
                onChange={(e) => setFixTokenAddress(e.target.value)}
              />
            </div>
            <Button
              onClick={() => fixTokenAddr && setDistributor(fixTokenAddr)}
              disabled={!fixTokenAddr || isFixPending || isFixConfirming || distributorConfigured === true}
              size="sm"
            >
              {isFixPending ? "Confirm..." : isFixConfirming ? "Confirming..." : "Set Distributor"}
            </Button>
          </div>
          {fixTokenAddr && currentDistributor !== undefined && (
            <div className={`mt-3 text-xs rounded-lg p-2 ${distributorConfigured ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
              {distributorConfigured
                ? "Distributor is correctly configured."
                : `Current distributor: ${(currentDistributor as string)?.slice(0, 14) || "0x0 (not set)"}... — needs to be set to RevenueDistributor.`}
            </div>
          )}
          {fixHash && (
            <a
              href={getEtherscanUrl(SEPOLIA_CHAIN_ID, fixHash, "tx")}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-blue-500 hover:underline mt-2"
            >
              Tx: {fixHash.slice(0, 14)}...
            </a>
          )}
        </CardContent>
      </Card>

      {/* Authorize Token Minting Agent */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <Heading as="h2" className="mb-2">Authorize Token Minting Agent</Heading>
          <Paragraph className="text-sm text-gray-600 mb-4">
            If milestone completion fails with &quot;UnauthorizedAgent&quot;, the PaymentProtocol needs to be registered as a minting agent on both the AssetToken and RevenueToken.
          </Paragraph>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                type="number"
                label="Vehicle NFT ID"
                placeholder="Enter vehicle token ID"
                value={agentVehicleIdInput}
                onChange={(e) => setAgentVehicleIdInput(e.target.value)}
                min={0}
              />
            </div>
            <Button
              onClick={() => {
                const id = parseInt(agentVehicleIdInput);
                if (!isNaN(id) && id >= 0) setAgentVehicleId(BigInt(id));
              }}
              disabled={!agentVehicleIdInput}
              size="sm"
            >
              Check
            </Button>
          </div>

          {agentVehicleId !== undefined && !agentAssetToken && !agentRevenueToken && (
            <div className="mt-3 text-xs rounded-lg p-2 bg-red-50 text-red-700">
              No tokens registered for Vehicle #{agentVehicleId.toString()}. Register tokens first via the Vehicle Setup Wizard.
            </div>
          )}

          {agentAssetToken && (
            <div className="mt-3 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">AssetToken</p>
                  <p className="text-xs text-gray-500 font-mono">{agentAssetToken}</p>
                </div>
                {isAssetAgent ? (
                  <Badge variant="success">Authorized</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => addAgentAsset(agentAssetToken, paymentProtocolAddress)}
                    disabled={isAgentAssetPending || isAgentAssetConfirming}
                  >
                    {isAgentAssetPending ? "Confirm..." : isAgentAssetConfirming ? "Confirming..." : "Add Agent"}
                  </Button>
                )}
              </div>
              {agentAssetHash && (
                <a
                  href={getEtherscanUrl(SEPOLIA_CHAIN_ID, agentAssetHash, "tx")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-500 hover:underline mt-1"
                >
                  Tx: {agentAssetHash.slice(0, 14)}...
                </a>
              )}
            </div>
          )}

          {agentRevenueToken && (
            <div className="mt-3 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">RevenueToken</p>
                  <p className="text-xs text-gray-500 font-mono">{agentRevenueToken}</p>
                </div>
                {isRevenueAgent ? (
                  <Badge variant="success">Authorized</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => addAgentRevenue(agentRevenueToken, paymentProtocolAddress)}
                    disabled={isAgentRevenuePending || isAgentRevenueConfirming}
                  >
                    {isAgentRevenuePending ? "Confirm..." : isAgentRevenueConfirming ? "Confirming..." : "Add Agent"}
                  </Button>
                )}
              </div>
              {agentRevenueHash && (
                <a
                  href={getEtherscanUrl(SEPOLIA_CHAIN_ID, agentRevenueHash, "tx")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-500 hover:underline mt-1"
                >
                  Tx: {agentRevenueHash.slice(0, 14)}...
                </a>
              )}
            </div>
          )}

          {agentAssetToken && agentRevenueToken && isAssetAgent && isRevenueAgent && (
            <div className="mt-3 text-xs rounded-lg p-2 bg-green-50 text-green-700">
              Both tokens are authorized. The PaymentProtocol can mint tokens when milestones complete.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Token Addresses from Chain */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <Heading as="h2" className="mb-2">Sync Token Addresses</Heading>
          <Paragraph className="text-sm text-gray-600 mb-4">
            If token addresses in the database don&apos;t match what&apos;s registered on-chain, use this to sync them. Enter a Vehicle NFT ID to compare.
          </Paragraph>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                type="number"
                label="Vehicle NFT ID"
                placeholder="Enter vehicle token ID"
                value={syncNftIdInput}
                onChange={(e) => setSyncNftIdInput(e.target.value)}
                min={0}
              />
            </div>
            <Button
              onClick={handleSyncLookup}
              disabled={!syncNftIdInput}
              size="sm"
            >
              Compare
            </Button>
          </div>

          {syncNftId !== undefined && syncDbVehicle && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">
                {syncDbVehicle.brand} {syncDbVehicle.model} — NFT #{syncNftId.toString()}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-medium text-gray-700 mb-1">Database (current)</p>
                  <p className={`font-mono ${dbAssetMismatch ? "text-red-600" : "text-gray-600"}`}>
                    AST: {syncDbVehicle.assetTokenAddress?.slice(0, 14) || "not set"}...
                  </p>
                  <p className={`font-mono ${dbRevenueMismatch ? "text-red-600" : "text-gray-600"}`}>
                    REV: {syncDbVehicle.revenueTokenAddress?.slice(0, 14) || "not set"}...
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-1">On-Chain (PaymentProtocol)</p>
                  <p className={`font-mono ${dbAssetMismatch ? "text-green-600 font-semibold" : "text-gray-600"}`}>
                    AST: {syncAssetToken?.slice(0, 14) || "not registered"}...
                  </p>
                  <p className={`font-mono ${dbRevenueMismatch ? "text-green-600 font-semibold" : "text-gray-600"}`}>
                    REV: {syncRevenueToken?.slice(0, 14) || "not registered"}...
                  </p>
                </div>
              </div>

              {hasAnyMismatch ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800 mb-2">
                    Address mismatch detected! The database has different token addresses than what&apos;s registered on-chain. Sync to update the database.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleSyncAddresses}
                    disabled={isSyncing || !syncAssetToken || !syncRevenueToken}
                  >
                    {isSyncing ? "Syncing..." : "Sync DB from Chain"}
                  </Button>
                </div>
              ) : syncAssetToken && syncRevenueToken ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <p className="text-xs text-green-800">
                    Database and on-chain addresses match.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                  <p className="text-xs text-gray-600">
                    No tokens registered on-chain for this vehicle.
                  </p>
                </div>
              )}
            </div>
          )}

          {syncNftId !== undefined && !syncDbVehicle && (
            <div className="mt-3 text-xs rounded-lg p-2 bg-red-50 text-red-700">
              No vehicle found in database for NFT #{syncNftId.toString()}.
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
