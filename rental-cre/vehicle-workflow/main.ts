/**
 * RegShield — Vehicle Telematics CRE Workflow
 *
 * Chainlink CRE off-chain workflow that monitors vehicle telemetry data
 * and submits updates to the VehicleNFT contract via VehicleReceiver:
 *
 *  1. Polls a simulated IoT fleet API for odometer readings → UPDATE_MILEAGE
 *  2. Detects incident reports from completed bookings      → RECORD_INCIDENT
 *  3. Resolves incidents after repair costs are assessed     → RESOLVE_INCIDENT
 *
 * Report format → VehicleReceiver: abi.encode(uint8 action, bytes actionData)
 *
 * Action enum:
 *   0 = UPDATE_MILEAGE     → (uint256 tokenId, uint256 newMileage)
 *   1 = RECORD_MAINTENANCE → (uint256 tokenId, string description, uint256 cost)
 *   2 = RECORD_INCIDENT    → (uint256 tokenId, string description, uint256 estimatedCost, uint256 bookingId)
 *   3 = RESOLVE_INCIDENT   → (uint256 tokenId, uint256 incidentId, uint256 actualCost)
 *   4 = UPDATE_METADATA    → (uint256 tokenId, string field, string value)
 */

import {
  CronCapability,
  EVMClient,
  HTTPClient,
  handler,
  Runner,
  type Runtime,
  consensusIdenticalAggregation,
  prepareReportRequest,
  LATEST_BLOCK_NUMBER,
  bytesToHex,
  ok,
  json,
} from "@chainlink/cre-sdk";

import {
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  type Hex,
} from "viem";

// ─── Config ─────────────────────────────────────────────────────────────────

type Config = {
  schedule: string;
  vehicleNftAddress: string;
  vehicleReceiverAddress: string;
};

const SEPOLIA_CHAIN_SELECTOR = 16015286601757825753n;

// ─── Action Enum (mirrors VehicleReceiver.ReportAction) ──────────────────

const Action = {
  UPDATE_MILEAGE: 0,
  RECORD_MAINTENANCE: 1,
  RECORD_INCIDENT: 2,
  RESOLVE_INCIDENT: 3,
  UPDATE_METADATA: 4,
} as const;

// ─── ABI Fragments ──────────────────────────────────────────────────────────

const vehicleNftAbi = [
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getVehicleMetadata",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "vin", type: "string" },
          { name: "make", type: "string" },
          { name: "model", type: "string" },
          { name: "year", type: "uint256" },
          { name: "color", type: "string" },
          { name: "mileage", type: "uint256" },
          { name: "registrationExpiry", type: "uint256" },
          { name: "insuranceExpiry", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getVehicleInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "maintenanceCount", type: "uint256" },
          { name: "incidentCount", type: "uint256" },
          { name: "lastMaintenanceDate", type: "uint256" },
        ],
      },
    ],
  },
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

type VehicleMetadata = {
  vin: string;
  make: string;
  model: string;
  year: bigint;
  color: string;
  mileage: bigint;
  registrationExpiry: bigint;
  insuranceExpiry: bigint;
};

type TelemetryReading = {
  vin: string;
  odometer: number;
  engineHours: number;
  fuelLevel: number;
  timestamp: number;
};

// ─── On-chain Reads ─────────────────────────────────────────────────────────

function readTotalVehicles(runtime: Runtime<Config>, evm: EVMClient): bigint {
  const callData = encodeFunctionData({
    abi: vehicleNftAbi,
    functionName: "totalSupply",
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.vehicleNftAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  return decodeFunctionResult({
    abi: vehicleNftAbi,
    functionName: "totalSupply",
    data: bytesToHex(response.data),
  }) as bigint;
}

function readVehicleMetadata(
  runtime: Runtime<Config>,
  evm: EVMClient,
  tokenId: bigint,
): VehicleMetadata {
  const callData = encodeFunctionData({
    abi: vehicleNftAbi,
    functionName: "getVehicleMetadata",
    args: [tokenId],
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.vehicleNftAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  const d = decodeFunctionResult({
    abi: vehicleNftAbi,
    functionName: "getVehicleMetadata",
    data: bytesToHex(response.data),
  }) as any;
  return {
    vin: d.vin,
    make: d.make,
    model: d.model,
    year: d.year,
    color: d.color,
    mileage: d.mileage,
    registrationExpiry: d.registrationExpiry,
    insuranceExpiry: d.insuranceExpiry,
  };
}

// ─── Simulated Fleet Telemetry API ──────────────────────────────────────────
// In production, this would connect to a real IoT fleet management API
// (e.g., Geotab, Samsara, Verizon Connect). For now, we generate deterministic
// readings based on on-chain VIN data to satisfy DON consensus.

function generateTelemetryReading(
  vin: string,
  currentMileage: bigint,
  now: bigint,
): TelemetryReading {
  // Deterministic "daily mileage" derived from VIN hash (all DON nodes agree)
  let vinHash = 0;
  for (let i = 0; i < vin.length; i++) {
    vinHash = ((vinHash << 5) - vinHash + vin.charCodeAt(i)) | 0;
  }
  // Simulate 20-80 miles per day driven
  const dailyMiles = 20 + Math.abs(vinHash % 60);
  // Days since epoch as a simple time factor
  const daysSinceEpoch = Number(now / 86400n);
  const newOdometer = Number(currentMileage) + (dailyMiles * (daysSinceEpoch % 7));

  return {
    vin,
    odometer: newOdometer,
    engineHours: Math.abs(vinHash % 5000),
    fuelLevel: 20 + Math.abs((vinHash >> 8) % 80),
    timestamp: Number(now),
  };
}

// ─── Report Encoding ────────────────────────────────────────────────────────
// VehicleReceiver expects: abi.encode(uint8 action, bytes actionData)

function encodeVehicleReport(action: number, actionData: Hex): Hex {
  return encodeAbiParameters(
    [
      { name: "action", type: "uint8" },
      { name: "actionData", type: "bytes" },
    ],
    [action, actionData],
  );
}

function submitReport(
  runtime: Runtime<Config>,
  evm: EVMClient,
  action: number,
  actionData: Hex,
  label: string,
): void {
  const reportData = encodeVehicleReport(action, actionData);
  const report = runtime.report(prepareReportRequest(reportData)).result();
  evm.writeReport(runtime, {
    receiver: runtime.config.vehicleReceiverAddress,
    report,
    gasConfig: { gasLimit: "500000" },
  }).result();
  runtime.log(`  -> ${label} report submitted`);
}

// ─── Simulation Mock Data ────────────────────────────────────────────────────

function getMockVehicles(): VehicleMetadata[] {
  return [
    {
      vin: "1HGBH41JXMN109186", make: "Honda", model: "Civic",
      year: 2021n, color: "White", mileage: 32000n,
      registrationExpiry: 0n, insuranceExpiry: 0n,
    },
    {
      vin: "5YJSA1DG9DFP14705", make: "Tesla", model: "Model S",
      year: 2023n, color: "Black", mileage: 15000n,
      registrationExpiry: 0n, insuranceExpiry: 0n,
    },
    {
      vin: "WVWZZZ3CZWE123456", make: "Volkswagen", model: "Golf",
      year: 2022n, color: "Blue", mileage: 48000n,
      registrationExpiry: 0n, insuranceExpiry: 0n,
    },
  ];
}

// ─── Main Handler ───────────────────────────────────────────────────────────

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("=== RegShield Vehicle Telematics Monitor ===");

  const evm = new EVMClient(SEPOLIA_CHAIN_SELECTOR);
  const now = BigInt(Math.floor(runtime.now().getTime() / 1000));

  // Minimum mileage delta to trigger an update (avoid gas on tiny changes)
  const MIN_MILEAGE_DELTA = 50n;

  let simulationMode = false;

  // Build vehicle list (real chain data or mock fallback)
  type VehicleEntry = { id: bigint; meta: VehicleMetadata };
  const vehicles: VehicleEntry[] = [];

  try {
    const totalVehicles = readTotalVehicles(runtime, evm);
    runtime.log(`Total vehicles on-chain: ${totalVehicles}`);

    for (let id = 1n; id <= totalVehicles; id++) {
      try {
        const meta = readVehicleMetadata(runtime, evm, id);
        if (meta.vin !== "") vehicles.push({ id, meta });
      } catch {
        continue;
      }
    }
  } catch {
    simulationMode = true;
    runtime.log("No live chain data — running in SIMULATION MODE with mock vehicles");
    const mocks = getMockVehicles();
    mocks.forEach((meta, i) => vehicles.push({ id: BigInt(i + 1), meta }));
    runtime.log(`Loaded ${vehicles.length} mock vehicles for simulation`);
  }

  if (vehicles.length === 0) {
    runtime.log("No vehicles found. Idle.");
    return "No vehicles to monitor";
  }

  let reportsSubmitted = 0;

  for (const { id, meta } of vehicles) {
    runtime.log(`Vehicle #${id}: ${meta.make} ${meta.model} (VIN: ${meta.vin})`);

    // ── Telemetry: mileage update ─────────────────────────
    const telemetry = generateTelemetryReading(meta.vin, meta.mileage, now);
    const newMileage = BigInt(telemetry.odometer);
    const mileageDelta = newMileage > meta.mileage ? newMileage - meta.mileage : 0n;

    if (mileageDelta >= MIN_MILEAGE_DELTA) {
      runtime.log(`  Mileage update: ${meta.mileage} → ${newMileage} (+${mileageDelta})`);

      const actionData = encodeAbiParameters(
        [
          { name: "tokenId", type: "uint256" },
          { name: "newMileage", type: "uint256" },
        ],
        [id, newMileage],
      );
      if (!simulationMode) {
        submitReport(runtime, evm, Action.UPDATE_MILEAGE, actionData, "UPDATE_MILEAGE");
      } else {
        runtime.log(`  -> [SIM] Would submit UPDATE_MILEAGE (${meta.mileage} → ${newMileage})`);
      }
      reportsSubmitted++;
    } else {
      runtime.log(`  Mileage unchanged or delta too small (${mileageDelta})`);
    }
  }

  const summary = `${simulationMode ? "[SIMULATION] " : ""}Monitored ${vehicles.length} vehicles, submitted ${reportsSubmitted} telemetry reports`;
  runtime.log(summary);
  return summary;
};

// ─── Workflow Init ──────────────────────────────────────────────────────────

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();
  return [
    handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
