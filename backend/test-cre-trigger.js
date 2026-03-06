/**
 * CRE Workflow Test Data Check
 * Checks on-chain state to see what data CRE workflows will process.
 *
 * Usage: node test-cre-trigger.js
 */

import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.SCHEDULER_PRIVATE_KEY;

if (!RPC_URL || !PRIVATE_KEY) {
  console.error("Missing SEPOLIA_RPC_URL or SCHEDULER_PRIVATE_KEY in .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract addresses (from workflow configs)
const CONTRACTS = {
  paymentProtocol: "0x2b246B3E17f46A8aa9F38C82C7f66f6B6BD329CC",
  vehicleNFT: "0xfcE0FD3671E99D65E0FF70b30b9238bB83D91814",
  investorRequestManager: "0x520efb46bc6ed01822dfc69ea7cde71b9ba6d6d2",
  rentalBooking: "0x144e3686533811ce108ded2249f3e18899154f86",
};

// Receiver addresses
const RECEIVERS = {
  payment: "0x2f7f8ed26b72a43988afa1f3088bd4969f39b7c2",
  compliance: "0x0ea9cd084287107bca0f9785b030c22db72301fd",
  vehicle: "0x73c58b5ba299faaa64103e453ba55b408c91e81b",
  onboarding: "0xf080a8b7ee2e83c9bee26a795e43d70b1d093850",
  campaign: "0x84a9b21b7d2ba6120923edaa32b283fd2e35fb94",
};

async function checkContracts() {
  console.log("=".repeat(60));
  console.log("CRE Workflow Test Data Check");
  console.log("=".repeat(60));
  console.log(`\nWallet: ${wallet.address}`);
  console.log(`Network: Sepolia\n`);

  // ─── Check Payment Protocol (Rental Workflow) ───
  console.log("─── Payment Protocol (Rental Workflow) ───");
  try {
    const contract = new ethers.Contract(
      CONTRACTS.paymentProtocol,
      ["function totalPayments() view returns (uint256)"],
      provider,
    );
    const total = await contract.totalPayments();
    console.log(`Total payments: ${total}`);

    if (total > 0n) {
      const detailAbi = [
        "function getMilestoneStatus(uint256) view returns (bool, bool, bool, bool)",
      ];
      const detailContract = new ethers.Contract(CONTRACTS.paymentProtocol, detailAbi, provider);
      for (let i = 0n; i < total && i < 5n; i++) {
        try {
          const [a, b, c, d] = await detailContract.getMilestoneStatus(i);
          const incomplete = [a, b, c, d].filter((v) => !v).length;
          console.log(`  Payment #${i}: ${4 - incomplete}/4 milestones complete ${incomplete > 0 ? "→ Rental workflow WILL process!" : "✓ Done"}`);
        } catch (e) {
          console.log(`  Payment #${i}: ${e.message?.slice(0, 60)}`);
        }
      }
    } else {
      console.log("  No payments. Create an investment to trigger rental workflow.");
    }
  } catch (e) {
    console.log(`  Error: ${e.message?.slice(0, 80)}`);
  }

  // ─── Check Vehicle NFT (Compliance + Vehicle Workflows) ───
  console.log("\n─── Vehicle NFT (Compliance & Vehicle Workflows) ───");
  try {
    const contract = new ethers.Contract(
      CONTRACTS.vehicleNFT,
      [
        "function totalSupply() view returns (uint256)",
        "function getVehicleMetadata(uint256) view returns (string, string, string, uint256, uint256, uint256, uint256)",
      ],
      provider,
    );
    const total = await contract.totalSupply();
    console.log(`Total vehicles: ${total}`);

    const now = BigInt(Math.floor(Date.now() / 1000));

    for (let i = 1n; i <= total && i <= 5n; i++) {
      try {
        const [vin, make, model, year, mileage, regExpiry, insExpiry] = await contract.getVehicleMetadata(i);
        const regExpired = regExpiry > 0n && regExpiry < now;
        const insExpired = insExpiry > 0n && insExpiry < now;
        console.log(`  Vehicle #${i}: ${make} ${model} (${year})`);
        console.log(`    VIN: ${vin}`);
        console.log(`    Registration: ${regExpiry > 0n ? new Date(Number(regExpiry) * 1000).toISOString().slice(0, 10) : "N/A"} ${regExpired ? "⚠ EXPIRED → Compliance workflow WILL trigger!" : "✓"}`);
        console.log(`    Insurance: ${insExpiry > 0n ? new Date(Number(insExpiry) * 1000).toISOString().slice(0, 10) : "N/A"} ${insExpired ? "⚠ EXPIRED → Compliance workflow WILL trigger!" : "✓"}`);
      } catch (e) {
        console.log(`  Vehicle #${i}: ${e.message?.slice(0, 60)}`);
      }
    }

    if (total === 0n) {
      console.log("  No vehicles. List a car to trigger compliance/vehicle workflows.");
    }
  } catch (e) {
    console.log(`  Error: ${e.message?.slice(0, 80)}`);
  }

  // ─── Check Investor Requests (Onboarding Workflow) ───
  console.log("\n─── Investor Requests (Onboarding Workflow) ───");
  try {
    const contract = new ethers.Contract(
      CONTRACTS.investorRequestManager,
      [
        "function getPendingRequests() view returns (address[])",
        "function getTotalRequests() view returns (uint256)",
      ],
      provider,
    );

    try {
      const total = await contract.getTotalRequests();
      console.log(`Total requests: ${total}`);
    } catch {
      console.log("  getTotalRequests not available");
    }

    try {
      const pending = await contract.getPendingRequests();
      console.log(`Pending requests: ${pending.length}`);
      if (pending.length > 0) {
        pending.forEach((addr, i) => console.log(`  ${i + 1}. ${addr} → Onboarding WILL process!`));
      } else {
        console.log("  No pending requests. Submit an investor request to trigger onboarding.");
      }
    } catch (e) {
      console.log(`  getPendingRequests: ${e.message?.slice(0, 60)}`);
    }
  } catch (e) {
    console.log(`  Error: ${e.message?.slice(0, 80)}`);
  }

  // ─── Check Bookings (Onboarding Workflow) ───
  console.log("\n─── Rental Bookings (Onboarding Workflow) ───");
  try {
    const contract = new ethers.Contract(
      CONTRACTS.rentalBooking,
      [
        "function totalBookings() view returns (uint256)",
        "function getBooking(uint256) view returns (address, uint256, uint256, uint256, uint8, uint256)",
      ],
      provider,
    );
    const total = await contract.totalBookings();
    console.log(`Total bookings: ${total}`);

    const statusNames = ["Pending", "Approved", "Active", "Completed", "Cancelled", "Disputed"];
    for (let i = 1n; i <= total && i <= 5n; i++) {
      try {
        const [renter, vehicleId, startDate, endDate, status, amount] = await contract.getBooking(i);
        const statusName = statusNames[Number(status)] || `Unknown(${status})`;
        console.log(`  Booking #${i}: Vehicle=${vehicleId}, Status=${statusName}, Renter=${renter.slice(0, 12)}...`);
        if (Number(status) === 0) {
          console.log(`    → Onboarding workflow WILL process this pending booking!`);
        }
      } catch (e) {
        console.log(`  Booking #${i}: ${e.message?.slice(0, 60)}`);
      }
    }

    if (total === 0n) {
      console.log("  No bookings. Book a vehicle to trigger onboarding workflow.");
    }
  } catch (e) {
    console.log(`  Error: ${e.message?.slice(0, 80)}`);
  }

  // ─── Check Receiver Events (any past CRE activity) ───
  console.log("\n─── Past CRE Receiver Events (last 50k blocks) ───");
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 50000);

  for (const [name, address] of Object.entries(RECEIVERS)) {
    try {
      const logs = await provider.getLogs({
        address,
        fromBlock,
        toBlock: "latest",
      });
      if (logs.length > 0) {
        const latest = logs[logs.length - 1];
        console.log(`  ${name}: ${logs.length} event(s) — latest at block ${latest.blockNumber}, tx ${latest.transactionHash.slice(0, 18)}...`);
      } else {
        console.log(`  ${name}: No events yet`);
      }
    } catch (e) {
      console.log(`  ${name}: ${e.message?.slice(0, 60)}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("What to do next:");
  console.log("1. If any items show 'WILL process/trigger', wait 10-15 min for CRE cron");
  console.log("2. If nothing actionable, create test data through the frontend:");
  console.log("   - Rentor: List a vehicle (triggers compliance/vehicle workflows)");
  console.log("   - Investor: Submit invest request (triggers onboarding workflow)");
  console.log("   - Renter: Book a vehicle (triggers onboarding workflow)");
  console.log("3. Check /admin/cre-activity for incoming events");
  console.log("=".repeat(60));
}

checkContracts().catch(console.error);
