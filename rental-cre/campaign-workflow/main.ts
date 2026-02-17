/**
 * RegShield — Campaign Monitor CRE Workflow
 *
 * Chainlink CRE off-chain workflow that monitors active fundraising campaigns
 * for vehicles and triggers batch refunds when campaigns fail or are cancelled:
 *
 *  1. Reads all vehicle investment campaigns from PaymentProtocol
 *  2. Checks if campaign deadline has passed
 *  3. Checks if minimum funding threshold was met
 *  4. If deadline passed + underfunded → submits CAMPAIGN_FAILED report
 *  5. If campaign cancelled flag set   → submits CAMPAIGN_CANCELLED report
 *
 * The CampaignMonitorReceiver then calls batchCancelVehiclePayments()
 * on RegShieldPaymentProtocol, which refunds all investors for that vehicle.
 *
 * Report format → CampaignMonitorReceiver: abi.encode(uint256 vehicleId, string action)
 *
 * Actions (string-based, not enum):
 *   "CAMPAIGN_FAILED"    — deadline passed, min funding not reached
 *   "CAMPAIGN_CANCELLED" — campaign manually cancelled by rentor
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
  paymentProtocolAddress: string;
  campaignReceiverAddress: string;
  vehicleNftAddress: string;
};

const SEPOLIA_CHAIN_SELECTOR = 16015286601757825753n;

// ─── ABI Fragments ──────────────────────────────────────────────────────────

const paymentProtocolAbi = [
  {
    name: "getActiveCampaignVehicles",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getCampaignInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vehicleId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "targetAmount", type: "uint256" },
          { name: "currentAmount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "minFundingPercentage", type: "uint256" },
          { name: "isCancelled", type: "bool" },
          { name: "isFinalized", type: "bool" },
          { name: "investorCount", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "vehicleInvestmentTotal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vehicleId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

type CampaignInfo = {
  targetAmount: bigint;
  currentAmount: bigint;
  deadline: bigint;
  minFundingPercentage: bigint;
  isCancelled: boolean;
  isFinalized: boolean;
  investorCount: bigint;
};

// ─── On-chain Reads ─────────────────────────────────────────────────────────

function readActiveCampaigns(
  runtime: Runtime<Config>,
  evm: EVMClient,
): bigint[] {
  const callData = encodeFunctionData({
    abi: paymentProtocolAbi,
    functionName: "getActiveCampaignVehicles",
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.paymentProtocolAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  return decodeFunctionResult({
    abi: paymentProtocolAbi,
    functionName: "getActiveCampaignVehicles",
    data: bytesToHex(response.data),
  }) as bigint[];
}

function readCampaignInfo(
  runtime: Runtime<Config>,
  evm: EVMClient,
  vehicleId: bigint,
): CampaignInfo {
  const callData = encodeFunctionData({
    abi: paymentProtocolAbi,
    functionName: "getCampaignInfo",
    args: [vehicleId],
  });
  const response = evm.callContract(runtime, {
    call: { to: runtime.config.paymentProtocolAddress, data: callData },
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  const d = decodeFunctionResult({
    abi: paymentProtocolAbi,
    functionName: "getCampaignInfo",
    data: bytesToHex(response.data),
  }) as any;
  return {
    targetAmount: d.targetAmount,
    currentAmount: d.currentAmount,
    deadline: d.deadline,
    minFundingPercentage: d.minFundingPercentage,
    isCancelled: d.isCancelled,
    isFinalized: d.isFinalized,
    investorCount: d.investorCount,
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

// ─── Report Encoding ────────────────────────────────────────────────────────
// CampaignMonitorReceiver expects: abi.encode(uint256 vehicleId, string action)

function submitReport(
  runtime: Runtime<Config>,
  evm: EVMClient,
  vehicleId: bigint,
  action: string,
): void {
  const reportData = encodeAbiParameters(
    [
      { name: "vehicleId", type: "uint256" },
      { name: "action", type: "string" },
    ],
    [vehicleId, action],
  );
  const report = runtime.report(prepareReportRequest(reportData)).result();
  evm.writeReport(runtime, {
    receiver: runtime.config.campaignReceiverAddress,
    report,
    gasConfig: { gasLimit: "1000000" }, // Higher gas for batch refund
  }).result();
  runtime.log(`  -> ${action} report submitted for vehicle #${vehicleId}`);
}

// ─── Simulation Mock Data ────────────────────────────────────────────────────

type MockCampaign = { vehicleId: bigint; campaign: CampaignInfo };

function getMockCampaigns(now: bigint): MockCampaign[] {
  const ONE_DAY = 86400n;
  const ETH = 1000000000000000000n; // 1e18
  return [
    {
      vehicleId: 1n,
      campaign: {
        targetAmount: 10n * ETH,
        currentAmount: 3n * ETH, // Only 30% funded
        deadline: now - 5n * ONE_DAY, // Deadline passed 5 days ago
        minFundingPercentage: 60n,
        isCancelled: false,
        isFinalized: false,
        investorCount: 2n,
      },
    },
    {
      vehicleId: 2n,
      campaign: {
        targetAmount: 5n * ETH,
        currentAmount: 4n * ETH, // 80% funded
        deadline: now + 10n * ONE_DAY, // 10 days left
        minFundingPercentage: 50n,
        isCancelled: true, // Cancelled by rentor
        isFinalized: false,
        investorCount: 3n,
      },
    },
    {
      vehicleId: 3n,
      campaign: {
        targetAmount: 8n * ETH,
        currentAmount: 7n * ETH, // 87% funded
        deadline: now + 30n * ONE_DAY,
        minFundingPercentage: 70n,
        isCancelled: false,
        isFinalized: false,
        investorCount: 5n,
      },
    },
  ];
}

// ─── Main Handler ───────────────────────────────────────────────────────────

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("=== RegShield Campaign Monitor ===");

  const evm = new EVMClient(SEPOLIA_CHAIN_SELECTOR);
  const now = BigInt(Math.floor(runtime.now().getTime() / 1000));

  let simulationMode = false;

  // Build campaign list (real chain data or mock fallback)
  const campaigns: MockCampaign[] = [];

  try {
    const vehicleIds = readActiveCampaigns(runtime, evm);
    runtime.log(`Active campaign vehicles: ${vehicleIds.length}`);

    for (const vehicleId of vehicleIds) {
      try {
        const campaign = readCampaignInfo(runtime, evm, vehicleId);
        campaigns.push({ vehicleId, campaign });
      } catch {
        continue;
      }
    }
  } catch {
    simulationMode = true;
    runtime.log("No live chain data — running in SIMULATION MODE with mock campaigns");
    campaigns.push(...getMockCampaigns(now));
    runtime.log(`Loaded ${campaigns.length} mock campaigns for simulation`);
  }

  if (campaigns.length === 0) {
    runtime.log("No active campaigns. Idle.");
    return "No campaigns to monitor";
  }

  let reportsSubmitted = 0;

  for (const { vehicleId, campaign } of campaigns) {
    // Skip already finalized campaigns
    if (campaign.isFinalized) continue;

    const fundingPercentage =
      campaign.targetAmount > 0n
        ? (campaign.currentAmount * 100n) / campaign.targetAmount
        : 0n;

    runtime.log(
      `  Vehicle #${vehicleId}: ${fundingPercentage}% funded, deadline=${campaign.deadline}, ` +
      `investors=${campaign.investorCount}, cancelled=${campaign.isCancelled}`,
    );

    // ── Check cancelled campaigns ─────────────────────────
    if (campaign.isCancelled && campaign.investorCount > 0n) {
      runtime.log(`  Campaign cancelled with ${campaign.investorCount} investors — triggering batch refund`);
      if (!simulationMode) {
        submitReport(runtime, evm, vehicleId, "CAMPAIGN_CANCELLED");
      } else {
        runtime.log(`  -> [SIM] Would submit CAMPAIGN_CANCELLED for vehicle #${vehicleId}`);
      }
      reportsSubmitted++;
      continue;
    }

    // ── Check failed campaigns (deadline passed + underfunded) ──
    if (campaign.deadline > 0n && campaign.deadline < now) {
      if (fundingPercentage < campaign.minFundingPercentage) {
        runtime.log(
          `  Deadline passed! ${fundingPercentage}% < ${campaign.minFundingPercentage}% min — campaign FAILED`,
        );
        if (!simulationMode) {
          submitReport(runtime, evm, vehicleId, "CAMPAIGN_FAILED");
        } else {
          runtime.log(`  -> [SIM] Would submit CAMPAIGN_FAILED for vehicle #${vehicleId}`);
        }
        reportsSubmitted++;
      } else {
        runtime.log(`  Deadline passed but funding met (${fundingPercentage}%) — campaign successful`);
      }
    } else {
      const daysLeft = campaign.deadline > 0n
        ? Number((campaign.deadline - now) / 86400n)
        : -1;
      runtime.log(`  Campaign active, ${daysLeft >= 0 ? `${daysLeft} days left` : "no deadline set"}`);
    }
  }

  const summary = `${simulationMode ? "[SIMULATION] " : ""}Monitored ${campaigns.length} campaigns, submitted ${reportsSubmitted} reports`;
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
