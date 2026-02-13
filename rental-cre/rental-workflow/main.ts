/**
 * RegShield — Vehicle Investment Lifecycle CRE Workflow
 *
 * Chainlink CRE off-chain workflow that monitors on-chain investment payments
 * and automatically verifies milestones using external APIs + chain state:
 *
 *  1. VEHICLE_IDENTIFIED  — NHTSA VIN decoder validates the linked vehicle
 *  2. PURCHASE_VERIFIED   — Vehicle NFT is active on-chain and investment escrowed
 *  3. INSURANCE_OBTAINED  — VehicleNFT insuranceExpiry is in the future
 *  4. REGISTRATION_COMPLETED — VehicleNFT registrationExpiry is in the future
 *
 * Once all four milestones are submitted, RegShieldPaymentProtocol auto-releases
 * escrowed ETH to the rentor and mints AssetToken + RevenueToken to the investor.
 *
 * Report format → PaymentReceiver: abi.encode(uint256 paymentId, string milestoneName)
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

// ─── Workflow Config (loaded from config.staging.json) ────────────────────────

type Config = {
  schedule: string;
  paymentProtocolAddress: string;
  paymentReceiverAddress: string;
  vehicleNftAddress: string;
};

// ─── Sepolia Chain Selector ───────────────────────────────────────────────────

const SEPOLIA_CHAIN_SELECTOR = 16015286601757825753n;

// ─── ABI Fragments ────────────────────────────────────────────────────────────

const paymentProtocolAbi = [
  {
    name: "totalPayments",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getMilestoneStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "vehicleIdentified", type: "bool" },
          { name: "purchaseVerified", type: "bool" },
          { name: "insuranceObtained", type: "bool" },
          { name: "registrationCompleted", type: "bool" },
          { name: "fundsReleased", type: "bool" },
          { name: "vehicleId", type: "uint256" },
          { name: "completedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getPaymentVehicle",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "vehicleInvestmentTotal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vehicleId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const vehicleNftAbi = [
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
    name: "getVehicleStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// VehicleStatus enum: 0=Available, 1=Rented, 2=Maintenance, 3=Retired

// ─── NHTSA VIN Decoder API (US DOT — free, no key required) ──────────────────

const NHTSA_API_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevin";

// ─── Types ────────────────────────────────────────────────────────────────────

type MilestoneStatus = {
  vehicleIdentified: boolean;
  purchaseVerified: boolean;
  insuranceObtained: boolean;
  registrationCompleted: boolean;
  fundsReleased: boolean;
  vehicleId: bigint;
  completedAt: bigint;
};

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

type NHTSAResult = {
  valid: boolean;
  make: string;
  model: string;
  year: string;
  bodyClass: string;
  errorCode: string;
};

// ─── On-chain Read Helpers ────────────────────────────────────────────────────

function readTotalPayments(
  runtime: Runtime<Config>,
  evm: EVMClient,
): bigint {
  const callData = encodeFunctionData({
    abi: paymentProtocolAbi,
    functionName: "totalPayments",
  });

  const response = evm.callContract(runtime, {
    call: { to: runtime.config.paymentProtocolAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();

  return decodeFunctionResult({
    abi: paymentProtocolAbi,
    functionName: "totalPayments",
    data: bytesToHex(response.data),
  }) as bigint;
}

function readMilestoneStatus(
  runtime: Runtime<Config>,
  evm: EVMClient,
  paymentId: bigint,
): MilestoneStatus {
  const callData = encodeFunctionData({
    abi: paymentProtocolAbi,
    functionName: "getMilestoneStatus",
    args: [paymentId],
  });

  const response = evm.callContract(runtime, {
    call: { to: runtime.config.paymentProtocolAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();

  const decoded = decodeFunctionResult({
    abi: paymentProtocolAbi,
    functionName: "getMilestoneStatus",
    data: bytesToHex(response.data),
  }) as any;

  return {
    vehicleIdentified: decoded.vehicleIdentified,
    purchaseVerified: decoded.purchaseVerified,
    insuranceObtained: decoded.insuranceObtained,
    registrationCompleted: decoded.registrationCompleted,
    fundsReleased: decoded.fundsReleased,
    vehicleId: decoded.vehicleId,
    completedAt: decoded.completedAt,
  };
}

function readVehicleMetadata(
  runtime: Runtime<Config>,
  evm: EVMClient,
  vehicleId: bigint,
): VehicleMetadata {
  const callData = encodeFunctionData({
    abi: vehicleNftAbi,
    functionName: "getVehicleMetadata",
    args: [vehicleId],
  });

  const response = evm.callContract(runtime, {
    call: { to: runtime.config.vehicleNftAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();

  const decoded = decodeFunctionResult({
    abi: vehicleNftAbi,
    functionName: "getVehicleMetadata",
    data: bytesToHex(response.data),
  }) as any;

  return {
    vin: decoded.vin,
    make: decoded.make,
    model: decoded.model,
    year: decoded.year,
    color: decoded.color,
    mileage: decoded.mileage,
    registrationExpiry: decoded.registrationExpiry,
    insuranceExpiry: decoded.insuranceExpiry,
  };
}

function readVehicleInvestmentTotal(
  runtime: Runtime<Config>,
  evm: EVMClient,
  vehicleId: bigint,
): bigint {
  const callData = encodeFunctionData({
    abi: paymentProtocolAbi,
    functionName: "vehicleInvestmentTotal",
    args: [vehicleId],
  });

  const response = evm.callContract(runtime, {
    call: { to: runtime.config.paymentProtocolAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();

  return decodeFunctionResult({
    abi: paymentProtocolAbi,
    functionName: "vehicleInvestmentTotal",
    data: bytesToHex(response.data),
  }) as bigint;
}

function readVehicleStatus(
  runtime: Runtime<Config>,
  evm: EVMClient,
  vehicleId: bigint,
): number {
  const callData = encodeFunctionData({
    abi: vehicleNftAbi,
    functionName: "getVehicleStatus",
    args: [vehicleId],
  });

  const response = evm.callContract(runtime, {
    call: { to: runtime.config.vehicleNftAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();

  return Number(
    decodeFunctionResult({
      abi: vehicleNftAbi,
      functionName: "getVehicleStatus",
      data: bytesToHex(response.data),
    }),
  );
}

// ─── NHTSA VIN Decoder (external API with DON consensus) ─────────────────────

function decodeVIN(
  runtime: Runtime<Config>,
  http: HTTPClient,
  vin: string,
): NHTSAResult {
  const fetchVIN = (requester: any, vinCode: string): NHTSAResult => {
    const response = requester.sendRequest({
      url: `${NHTSA_API_BASE}/${vinCode}?format=json`,
      method: "GET",
    }).result();

    if (!ok(response)) {
      return {
        valid: false,
        make: "",
        model: "",
        year: "",
        bodyClass: "",
        errorCode: "HTTP_ERROR",
      };
    }

    const data = json(response) as any;
    const results = data.Results as any[];

    // NHTSA variable IDs
    const getValue = (variableId: number): string => {
      const item = results.find((r: any) => r.VariableId === variableId);
      return item?.Value || "";
    };

    return {
      valid: getValue(143) === "0", // Error Code = 0 means valid
      make: getValue(26),           // Make
      model: getValue(28),          // Model
      year: getValue(29),           // Model Year
      bodyClass: getValue(5),       // Body Class
      errorCode: getValue(143),
    };
  };

  return http.sendRequest(
    runtime,
    fetchVIN,
    consensusIdenticalAggregation<NHTSAResult>(),
  )(vin).result();
}

// ─── Report Encoder ───────────────────────────────────────────────────────────
// PaymentReceiver expects: abi.encode(uint256 paymentId, string milestoneName)

function encodeReport(paymentId: bigint, milestoneName: string): Hex {
  return encodeAbiParameters(
    [
      { name: "paymentId", type: "uint256" },
      { name: "milestoneName", type: "string" },
    ],
    [paymentId, milestoneName],
  );
}

// ─── Submit Milestone Report to PaymentReceiver ──────────────────────────────

function submitMilestone(
  runtime: Runtime<Config>,
  evm: EVMClient,
  paymentId: bigint,
  milestoneName: string,
): void {
  const reportData = encodeReport(paymentId, milestoneName);
  const report = runtime.report(prepareReportRequest(reportData)).result();

  evm.writeReport(runtime, {
    receiver: runtime.config.paymentReceiverAddress,
    report,
    gasConfig: { gasLimit: "500000" },
  }).result();

  runtime.log(`  -> ${milestoneName} report submitted for payment #${paymentId}`);
}

// ─── Main Workflow Handler ────────────────────────────────────────────────────

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("=== RegShield Vehicle Investment Lifecycle ===");

  const evm = new EVMClient(SEPOLIA_CHAIN_SELECTOR);
  const http = new HTTPClient();

  // Step 1: Read total payments on-chain
  let totalPayments: bigint;
  try {
    totalPayments = readTotalPayments(runtime, evm);
  } catch {
    // CRE simulator returns empty 0x for EVM calls — handle gracefully
    runtime.log("No chain data (simulation mode or RPC error). Exiting.");
    return "No chain data available";
  }
  runtime.log(`Total payments on-chain: ${totalPayments}`);

  if (totalPayments === 0n) {
    runtime.log("No payments found. Idle.");
    return "No payments to process";
  }

  let reportsSubmitted = 0;

  // Step 2: Iterate all payments and verify pending milestones
  for (let i = 1n; i <= totalPayments; i++) {
    const ms = readMilestoneStatus(runtime, evm, i);

    // Skip fully completed / released payments
    if (ms.fundsReleased) continue;
    // Skip payments with no linked vehicle yet
    if (ms.vehicleId === 0n) continue;

    runtime.log(`Payment #${i} — vehicle #${ms.vehicleId}`);

    // ── Milestone 1: VEHICLE_IDENTIFIED ──────────────────────────
    // Verify VIN via NHTSA (real US DOT external API)
    if (!ms.vehicleIdentified) {
      const meta = readVehicleMetadata(runtime, evm, ms.vehicleId);

      if (meta.vin !== "") {
        runtime.log(`  Verifying VIN ${meta.vin} via NHTSA...`);
        const nhtsa = decodeVIN(runtime, http, meta.vin);

        if (nhtsa.valid) {
          runtime.log(`  VIN valid: ${nhtsa.year} ${nhtsa.make} ${nhtsa.model} (${nhtsa.bodyClass})`);
          submitMilestone(runtime, evm, i, "VEHICLE_IDENTIFIED");
          reportsSubmitted++;
        } else {
          runtime.log(`  VIN invalid (error code: ${nhtsa.errorCode})`);
        }
      } else {
        runtime.log("  No VIN set on vehicle — skipping");
      }
      continue; // Process one milestone per payment per cycle
    }

    // ── Milestone 2: PURCHASE_VERIFIED ───────────────────────────
    // Verify vehicle is active on-chain (not Retired) and ETH was escrowed
    if (!ms.purchaseVerified) {
      const status = readVehicleStatus(runtime, evm, ms.vehicleId);
      const invested = readVehicleInvestmentTotal(runtime, evm, ms.vehicleId);

      const statusLabels = ["Available", "Rented", "Maintenance", "Retired"];
      runtime.log(`  Vehicle status: ${statusLabels[status] ?? "Unknown"}, invested: ${invested} wei`);

      if (status !== 3 && invested > 0n) {
        runtime.log("  Vehicle active and investment escrowed — purchase verified");
        submitMilestone(runtime, evm, i, "PURCHASE_VERIFIED");
        reportsSubmitted++;
      } else if (status === 3) {
        runtime.log("  Vehicle is retired — cannot verify purchase");
      } else {
        runtime.log("  No investment found in escrow");
      }
      continue;
    }

    // ── Milestone 3: INSURANCE_OBTAINED ──────────────────────────
    // Check VehicleNFT insuranceExpiry > now
    if (!ms.insuranceObtained) {
      const meta = readVehicleMetadata(runtime, evm, ms.vehicleId);
      const now = BigInt(Math.floor(runtime.now().getTime() / 1000));

      if (meta.insuranceExpiry > now) {
        runtime.log(`  Insurance valid until ${meta.insuranceExpiry}`);
        submitMilestone(runtime, evm, i, "INSURANCE_OBTAINED");
        reportsSubmitted++;
      } else {
        runtime.log(`  Insurance expired or not set (expiry: ${meta.insuranceExpiry})`);
      }
      continue;
    }

    // ── Milestone 4: REGISTRATION_COMPLETED ──────────────────────
    // Check VehicleNFT registrationExpiry > now
    if (!ms.registrationCompleted) {
      const meta = readVehicleMetadata(runtime, evm, ms.vehicleId);
      const now = BigInt(Math.floor(runtime.now().getTime() / 1000));

      if (meta.registrationExpiry > now) {
        runtime.log(`  Registration valid until ${meta.registrationExpiry}`);
        submitMilestone(runtime, evm, i, "REGISTRATION_COMPLETED");
        reportsSubmitted++;
      } else {
        runtime.log(`  Registration expired or not set (expiry: ${meta.registrationExpiry})`);
      }
    }
  }

  const summary = `Processed ${totalPayments} payments, submitted ${reportsSubmitted} reports`;
  runtime.log(summary);
  return summary;
};

// ─── Workflow Init ────────────────────────────────────────────────────────────

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger({ schedule: config.schedule }),
      onCronTrigger,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
