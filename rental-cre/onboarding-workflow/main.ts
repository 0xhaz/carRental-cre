/**
 * RegShield — Onboarding CRE Workflow
 *
 * Chainlink CRE off-chain workflow that monitors pending investor requests
 * and booking applications, then auto-approves or rejects them based on
 * on-chain compliance checks and identity verification:
 *
 *  1. Reads pending investor requests from InvestorRequestManager
 *  2. Validates identity on IdentityRegistry (on-chain ERC-3643 check)
 *  3. Auto-approves verified investors, rejects unverified ones
 *  4. Reads pending bookings from RentalBooking
 *  5. Validates renter compliance (not blacklisted, valid license)
 *  6. Auto-approves/rejects bookings
 *
 * Report format → OnboardingReceiver: abi.encode(uint8 action, bytes actionData)
 *
 * Action enum:
 *   0 = APPROVE_INVESTOR → (address investor)
 *   1 = REJECT_INVESTOR  → (address investor, string reason)
 *   2 = APPROVE_BOOKING  → (uint256 bookingId)
 *   3 = REJECT_BOOKING   → (uint256 bookingId, string reason)
 */

import {
  CronCapability,
  EVMClient,
  handler,
  Runner,
  type Runtime,
  prepareReportRequest,
  LATEST_BLOCK_NUMBER,
  bytesToHex,
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
  investorRequestManagerAddress: string;
  rentalBookingAddress: string;
  renterComplianceAddress: string;
  identityRegistryAddress: string;
  onboardingReceiverAddress: string;
  worldIDVerifierAddress: string;
};

const SEPOLIA_CHAIN_SELECTOR = 16015286601757825753n;

// ─── Action Enum (mirrors OnboardingReceiver.ReportAction) ───────────────

const Action = {
  APPROVE_INVESTOR: 0,
  REJECT_INVESTOR: 1,
  APPROVE_BOOKING: 2,
  REJECT_BOOKING: 3,
} as const;

// ─── ABI Fragments ──────────────────────────────────────────────────────────

const investorRequestManagerAbi = [
  {
    name: "getPendingRequests",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;

const identityRegistryAbi = [
  {
    name: "isVerified",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const rentalBookingAbi = [
  {
    name: "totalBookings",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getBooking",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "bookingId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "renter", type: "address" },
          { name: "vehicleId", type: "uint256" },
          { name: "startDate", type: "uint256" },
          { name: "endDate", type: "uint256" },
          { name: "totalPrice", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
] as const;

const worldIDVerifierAbi = [
  {
    name: "isWorldIDVerified",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const renterComplianceAbi = [
  {
    name: "validateRenter",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "renter", type: "address" }],
    outputs: [
      { name: "isValid", type: "bool" },
      { name: "reason", type: "uint8" },
    ],
  },
] as const;

// BookingStatus enum: 0=Pending, 1=Approved, 2=Active, 3=Completed, 4=Cancelled, 5=Disputed
const BOOKING_STATUS_PENDING = 0;

// ─── On-chain Reads ─────────────────────────────────────────────────────────

function readPendingInvestors(
  runtime: Runtime<Config>,
  evm: EVMClient,
): `0x${string}`[] {
  const callData = encodeFunctionData({
    abi: investorRequestManagerAbi,
    functionName: "getPendingRequests",
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.investorRequestManagerAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  return decodeFunctionResult({
    abi: investorRequestManagerAbi,
    functionName: "getPendingRequests",
    data: bytesToHex(response.data),
  }) as `0x${string}`[];
}

function isIdentityVerified(
  runtime: Runtime<Config>,
  evm: EVMClient,
  user: `0x${string}`,
): boolean {
  const callData = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: "isVerified",
    args: [user],
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.identityRegistryAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  return decodeFunctionResult({
    abi: identityRegistryAbi,
    functionName: "isVerified",
    data: bytesToHex(response.data),
  }) as boolean;
}

function checkWorldIDVerified(
  runtime: Runtime<Config>,
  evm: EVMClient,
  user: `0x${string}`,
): boolean {
  const callData = encodeFunctionData({
    abi: worldIDVerifierAbi,
    functionName: "isWorldIDVerified",
    args: [user],
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.worldIDVerifierAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  return decodeFunctionResult({
    abi: worldIDVerifierAbi,
    functionName: "isWorldIDVerified",
    data: bytesToHex(response.data),
  }) as boolean;
}

function readTotalBookings(
  runtime: Runtime<Config>,
  evm: EVMClient,
): bigint {
  const callData = encodeFunctionData({
    abi: rentalBookingAbi,
    functionName: "totalBookings",
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.rentalBookingAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  return decodeFunctionResult({
    abi: rentalBookingAbi,
    functionName: "totalBookings",
    data: bytesToHex(response.data),
  }) as bigint;
}

function readBooking(
  runtime: Runtime<Config>,
  evm: EVMClient,
  bookingId: bigint,
): { renter: `0x${string}`; vehicleId: bigint; status: number } {
  const callData = encodeFunctionData({
    abi: rentalBookingAbi,
    functionName: "getBooking",
    args: [bookingId],
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.rentalBookingAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  const d = decodeFunctionResult({
    abi: rentalBookingAbi,
    functionName: "getBooking",
    data: bytesToHex(response.data),
  }) as any;
  return {
    renter: d.renter,
    vehicleId: d.vehicleId,
    status: Number(d.status),
  };
}

function validateRenter(
  runtime: Runtime<Config>,
  evm: EVMClient,
  renter: `0x${string}`,
): { isValid: boolean; reason: number } {
  const callData = encodeFunctionData({
    abi: renterComplianceAbi,
    functionName: "validateRenter",
    args: [renter],
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.renterComplianceAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  const d = decodeFunctionResult({
    abi: renterComplianceAbi,
    functionName: "validateRenter",
    data: bytesToHex(response.data),
  }) as any;
  return { isValid: d[0] || d.isValid, reason: Number(d[1] || d.reason) };
}

// ─── Report Encoding ────────────────────────────────────────────────────────
// OnboardingReceiver expects: abi.encode(uint8 action, bytes actionData)

function encodeOnboardingReport(action: number, actionData: Hex): Hex {
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
  const reportData = encodeOnboardingReport(action, actionData);
  const report = runtime.report(prepareReportRequest(reportData)).result();
  evm.writeReport(runtime, {
    receiver: runtime.config.onboardingReceiverAddress,
    report,
    gasConfig: { gasLimit: "500000" },
  }).result();
  runtime.log(`  -> ${label} report submitted`);
}

// ─── Rejection Reason Labels ────────────────────────────────────────────────

const REJECTION_REASONS: Record<number, string> = {
  1: "Under minimum age",
  2: "License expired",
  3: "Insurance not valid",
  4: "Poor credit score",
  5: "Too many incidents",
  6: "Blacklisted",
  7: "Identity not verified",
  8: "Region restricted",
  9: "Account suspended",
  10: "KYC incomplete",
  11: "Sanctions match",
};

// ─── Simulation Mock Data ────────────────────────────────────────────────────

type MockInvestor = { address: `0x${string}`; verified: boolean; worldIdVerified: boolean };
type MockBooking = { renter: `0x${string}`; vehicleId: bigint; status: number; isValid: boolean; reason: number };

function getMockInvestors(): MockInvestor[] {
  return [
    { address: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12", verified: true, worldIdVerified: true },
    { address: "0x1111222233334444555566667777888899990000", verified: false, worldIdVerified: false },
    { address: "0xAAAABBBBCCCCDDDDEEEEFFFF0000111122223333", verified: true, worldIdVerified: false },
  ];
}

function getMockBookings(): MockBooking[] {
  return [
    { renter: "0xFEDCBA9876543210FEDCBA9876543210FEDCBA98", vehicleId: 1n, status: BOOKING_STATUS_PENDING, isValid: true, reason: 0 },
    { renter: "0x9999888877776666555544443333222211110000", vehicleId: 2n, status: BOOKING_STATUS_PENDING, isValid: false, reason: 6 }, // Blacklisted
    { renter: "0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF", vehicleId: 1n, status: 1, isValid: true, reason: 0 }, // Already approved
  ];
}

// ─── Main Handler ───────────────────────────────────────────────────────────

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("=== RegShield Onboarding Auto-Processor ===");

  const evm = new EVMClient(SEPOLIA_CHAIN_SELECTOR);
  let reportsSubmitted = 0;
  let simulationMode = false;

  // ── Part 1: Process Pending Investor Requests ───────────
  let pendingInvestors: `0x${string}`[] = [];
  let mockInvestors: MockInvestor[] = [];

  try {
    pendingInvestors = readPendingInvestors(runtime, evm);
    runtime.log(`Pending investor requests: ${pendingInvestors.length}`);
  } catch {
    simulationMode = true;
    runtime.log("No live chain data — running in SIMULATION MODE with mock data");
    mockInvestors = getMockInvestors();
    runtime.log(`Loaded ${mockInvestors.length} mock investor requests`);
  }

  if (simulationMode) {
    for (const inv of mockInvestors) {
      runtime.log(`  Checking investor ${inv.address}...`);
      runtime.log(`  Identity: ${inv.verified}, World ID: ${inv.worldIdVerified}`);
      if (inv.verified) {
        runtime.log(`  Identity verified${inv.worldIdVerified ? " + World ID verified" : ""} — auto-approving`);
        runtime.log(`  -> [SIM] Would submit APPROVE_INVESTOR for ${inv.address}`);
      } else {
        runtime.log(`  Identity NOT verified — rejecting`);
        runtime.log(`  -> [SIM] Would submit REJECT_INVESTOR for ${inv.address}`);
      }
      reportsSubmitted++;
    }
  } else {
    for (const investor of pendingInvestors) {
      runtime.log(`  Checking investor ${investor}...`);
      const identityVerified = isIdentityVerified(runtime, evm, investor);

      // World ID check (optional — wrapped in try/catch in case contract not deployed)
      let worldIdVerified = false;
      try {
        worldIdVerified = checkWorldIDVerified(runtime, evm, investor);
      } catch {
        runtime.log(`  World ID check unavailable — skipping`);
      }

      runtime.log(`  Identity: ${identityVerified}, World ID: ${worldIdVerified}`);

      if (identityVerified) {
        runtime.log(`  Identity verified${worldIdVerified ? " + World ID verified" : ""} — auto-approving`);
        const actionData = encodeAbiParameters(
          [{ name: "investor", type: "address" }],
          [investor],
        );
        submitReport(runtime, evm, Action.APPROVE_INVESTOR, actionData, "APPROVE_INVESTOR");
        reportsSubmitted++;
      } else {
        runtime.log(`  Identity NOT verified — rejecting`);
        const actionData = encodeAbiParameters(
          [
            { name: "investor", type: "address" },
            { name: "reason", type: "string" },
          ],
          [investor, "Identity not verified on IdentityRegistry — CRE auto-rejection"],
        );
        submitReport(runtime, evm, Action.REJECT_INVESTOR, actionData, "REJECT_INVESTOR");
        reportsSubmitted++;
      }
    }
  }

  // ── Part 2: Process Pending Bookings ────────────────────
  if (simulationMode) {
    const mockBookings = getMockBookings();
    runtime.log(`Loaded ${mockBookings.length} mock bookings`);

    for (let i = 0; i < mockBookings.length; i++) {
      const booking = mockBookings[i];
      if (booking.status !== BOOKING_STATUS_PENDING) continue;

      runtime.log(`  Booking #${i + 1}: renter=${booking.renter}, vehicle=#${booking.vehicleId}`);

      if (booking.isValid) {
        runtime.log(`  Renter compliant — auto-approving booking`);
        runtime.log(`  -> [SIM] Would submit APPROVE_BOOKING #${i + 1}`);
      } else {
        const reason = REJECTION_REASONS[booking.reason] || `Compliance check failed (code: ${booking.reason})`;
        runtime.log(`  Renter non-compliant: ${reason} — rejecting booking`);
        runtime.log(`  -> [SIM] Would submit REJECT_BOOKING #${i + 1}: ${reason}`);
      }
      reportsSubmitted++;
    }
  } else {
    try {
      const totalBookings = readTotalBookings(runtime, evm);
      runtime.log(`Total bookings on-chain: ${totalBookings}`);

      for (let i = 1n; i <= totalBookings; i++) {
        let booking;
        try {
          booking = readBooking(runtime, evm, i);
        } catch {
          continue;
        }

        if (booking.status !== BOOKING_STATUS_PENDING) continue;

        runtime.log(`  Booking #${i}: renter=${booking.renter}, vehicle=#${booking.vehicleId}`);

        const validation = validateRenter(runtime, evm, booking.renter);

        if (validation.isValid) {
          runtime.log(`  Renter compliant — auto-approving booking`);
          const actionData = encodeAbiParameters(
            [{ name: "bookingId", type: "uint256" }],
            [i],
          );
          submitReport(runtime, evm, Action.APPROVE_BOOKING, actionData, "APPROVE_BOOKING");
          reportsSubmitted++;
        } else {
          const reason = REJECTION_REASONS[validation.reason] || `Compliance check failed (code: ${validation.reason})`;
          runtime.log(`  Renter non-compliant: ${reason} — rejecting booking`);
          const actionData = encodeAbiParameters(
            [
              { name: "bookingId", type: "uint256" },
              { name: "reason", type: "string" },
            ],
            [i, `${reason} — CRE auto-rejection`],
          );
          submitReport(runtime, evm, Action.REJECT_BOOKING, actionData, "REJECT_BOOKING");
          reportsSubmitted++;
        }
      }
    } catch {
      runtime.log(`Booking processing error`);
    }
  }

  const summary = `${simulationMode ? "[SIMULATION] " : ""}Submitted ${reportsSubmitted} onboarding reports`;
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
