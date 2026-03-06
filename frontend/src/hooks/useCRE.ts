/**
 * Chainlink CRE Hooks
 * Hooks for reading CRE receiver contract state and events.
 * Each receiver routes verified off-chain data to on-chain contracts.
 */

import { useReadContract, useWatchContractEvent } from "wagmi";
import { createPublicClient, http, fallback } from "viem";
import { sepolia } from "viem/chains";
import {
  usePaymentReceiver,
  useComplianceReceiver,
  useVehicleReceiver,
  useOnboardingReceiver,
  useCampaignMonitorReceiver,
} from "./useContracts";
import type {
  CREReceiverConfig,
  PaymentReportEvent,
  ComplianceReportEvent,
  VehicleReportEvent,
  OnboardingReportEvent,
  CampaignReportEvent,
  ComplianceAction,
  VehicleAction,
  OnboardingAction,
  CampaignMonitorAction,
} from "@/types/cre";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COMPLIANCE_ACTION_LABELS,
  VEHICLE_ACTION_LABELS,
  ONBOARDING_ACTION_LABELS,
} from "@/types/cre";
import type { CREActivityItem } from "@/types/cre";

// ═══════════════════════════════════════════════
// Shared: Receiver Configuration
// ═══════════════════════════════════════════════

/**
 * Read the current configuration of any CRE receiver
 */
export function useReceiverConfig(
  receiverHook: () => { address: `0x${string}`; abi: any },
) {
  const { address, abi } = receiverHook();

  const forwarder = useReadContract({
    address,
    abi,
    functionName: "getForwarderAddress",
  });

  const author = useReadContract({
    address,
    abi,
    functionName: "getExpectedAuthor",
  });

  const workflowName = useReadContract({
    address,
    abi,
    functionName: "getExpectedWorkflowName",
  });

  const workflowId = useReadContract({
    address,
    abi,
    functionName: "getExpectedWorkflowId",
  });

  return {
    forwarderAddress: forwarder.data as `0x${string}` | undefined,
    expectedAuthor: author.data as `0x${string}` | undefined,
    expectedWorkflowName: workflowName.data as `0x${string}` | undefined,
    expectedWorkflowId: workflowId.data as `0x${string}` | undefined,
    isLoading:
      forwarder.isLoading ||
      author.isLoading ||
      workflowName.isLoading ||
      workflowId.isLoading,
  };
}

// ═══════════════════════════════════════════════
// PaymentReceiver Hooks
// ═══════════════════════════════════════════════

/** Read the PaymentReceiver's target protocol address */
export function usePaymentReceiverProtocol() {
  const { address, abi } = usePaymentReceiver();

  return useReadContract({
    address,
    abi,
    functionName: "paymentProtocol",
  });
}

/** Read PaymentReceiver configuration */
export function usePaymentReceiverConfig() {
  return useReceiverConfig(usePaymentReceiver);
}

/** Watch for PaymentReportProcessed events */
export function useWatchPaymentReports(
  onEvent?: (event: PaymentReportEvent) => void,
) {
  const { address, abi } = usePaymentReceiver();
  const [events, setEvents] = useState<PaymentReportEvent[]>([]);

  useWatchContractEvent({
    address,
    abi,
    eventName: "PaymentReportProcessed",
    onLogs(logs) {
      const newEvents = logs.map((log) => ({
        paymentId: (log as any).args.paymentId as bigint,
        milestone: (log as any).args.milestone as string,
        timestamp: (log as any).args.timestamp as bigint,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      })) as PaymentReportEvent[];

      setEvents((prev) => [...newEvents, ...prev]);
      newEvents.forEach((e) => onEvent?.(e));
    },
  });

  return events;
}

// ═══════════════════════════════════════════════
// ComplianceReceiver Hooks
// ═══════════════════════════════════════════════

/** Read the ComplianceReceiver's target contract addresses */
export function useComplianceReceiverTargets() {
  const { address, abi } = useComplianceReceiver();

  const renterCompliance = useReadContract({
    address,
    abi,
    functionName: "renterCompliance",
  });

  const operationalCompliance = useReadContract({
    address,
    abi,
    functionName: "operationalCompliance",
  });

  return {
    renterCompliance: renterCompliance.data as `0x${string}` | undefined,
    operationalCompliance: operationalCompliance.data as
      | `0x${string}`
      | undefined,
    isLoading: renterCompliance.isLoading || operationalCompliance.isLoading,
  };
}

/** Read ComplianceReceiver configuration */
export function useComplianceReceiverConfig() {
  return useReceiverConfig(useComplianceReceiver);
}

/** Watch for ComplianceReportProcessed events */
export function useWatchComplianceReports(
  onEvent?: (event: ComplianceReportEvent) => void,
) {
  const { address, abi } = useComplianceReceiver();
  const [events, setEvents] = useState<ComplianceReportEvent[]>([]);

  useWatchContractEvent({
    address,
    abi,
    eventName: "ComplianceReportProcessed",
    onLogs(logs) {
      const newEvents = logs.map((log) => ({
        action: Number((log as any).args.action) as ComplianceAction,
        timestamp: (log as any).args.timestamp as bigint,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      })) as ComplianceReportEvent[];

      setEvents((prev) => [...newEvents, ...prev]);
      newEvents.forEach((e) => onEvent?.(e));
    },
  });

  return events;
}

// ═══════════════════════════════════════════════
// VehicleReceiver Hooks
// ═══════════════════════════════════════════════

/** Read the VehicleReceiver's target VehicleNFT address */
export function useVehicleReceiverTarget() {
  const { address, abi } = useVehicleReceiver();

  return useReadContract({
    address,
    abi,
    functionName: "vehicleNFT",
  });
}

/** Read VehicleReceiver configuration */
export function useVehicleReceiverConfig() {
  return useReceiverConfig(useVehicleReceiver);
}

/** Watch for VehicleReportProcessed events */
export function useWatchVehicleReports(
  onEvent?: (event: VehicleReportEvent) => void,
) {
  const { address, abi } = useVehicleReceiver();
  const [events, setEvents] = useState<VehicleReportEvent[]>([]);

  useWatchContractEvent({
    address,
    abi,
    eventName: "VehicleReportProcessed",
    onLogs(logs) {
      const newEvents = logs.map((log) => ({
        action: Number((log as any).args.action) as VehicleAction,
        timestamp: (log as any).args.timestamp as bigint,
        tokenId: (log as any).args.tokenId as bigint,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      })) as VehicleReportEvent[];

      setEvents((prev) => [...newEvents, ...prev]);
      newEvents.forEach((e) => onEvent?.(e));
    },
  });

  return events;
}

// ═══════════════════════════════════════════════
// OnboardingReceiver Hooks
// ═══════════════════════════════════════════════

/** Read the OnboardingReceiver's target contract addresses */
export function useOnboardingReceiverTargets() {
  const { address, abi } = useOnboardingReceiver();

  const investorRequestManager = useReadContract({
    address,
    abi,
    functionName: "investorRequestManager",
  });

  const rentalBooking = useReadContract({
    address,
    abi,
    functionName: "rentalBooking",
  });

  return {
    investorRequestManager: investorRequestManager.data as
      | `0x${string}`
      | undefined,
    rentalBooking: rentalBooking.data as `0x${string}` | undefined,
    isLoading: investorRequestManager.isLoading || rentalBooking.isLoading,
  };
}

/** Read OnboardingReceiver configuration */
export function useOnboardingReceiverConfig() {
  return useReceiverConfig(useOnboardingReceiver);
}

/** Watch for OnboardingReportProcessed events */
export function useWatchOnboardingReports(
  onEvent?: (event: OnboardingReportEvent) => void,
) {
  const { address, abi } = useOnboardingReceiver();
  const [events, setEvents] = useState<OnboardingReportEvent[]>([]);

  useWatchContractEvent({
    address,
    abi,
    eventName: "OnboardingReportProcessed",
    onLogs(logs) {
      const newEvents = logs.map((log) => ({
        action: Number((log as any).args.action) as OnboardingAction,
        timestamp: (log as any).args.timestamp as bigint,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      })) as OnboardingReportEvent[];

      setEvents((prev) => [...newEvents, ...prev]);
      newEvents.forEach((e) => onEvent?.(e));
    },
  });

  return events;
}

// ═══════════════════════════════════════════════
// CampaignMonitorReceiver Hooks
// ═══════════════════════════════════════════════

/** Read the CampaignMonitorReceiver's target protocol address */
export function useCampaignMonitorProtocol() {
  const { address, abi } = useCampaignMonitorReceiver();

  return useReadContract({
    address,
    abi,
    functionName: "paymentProtocol",
  });
}

/** Read CampaignMonitorReceiver configuration */
export function useCampaignMonitorConfig() {
  return useReceiverConfig(useCampaignMonitorReceiver);
}

/** Watch for CampaignReportProcessed events */
export function useWatchCampaignReports(
  onEvent?: (event: CampaignReportEvent) => void,
) {
  const { address, abi } = useCampaignMonitorReceiver();
  const [events, setEvents] = useState<CampaignReportEvent[]>([]);

  useWatchContractEvent({
    address,
    abi,
    eventName: "CampaignReportProcessed",
    onLogs(logs) {
      const newEvents = logs.map((log) => ({
        vehicleId: (log as any).args.vehicleId as bigint,
        action: (log as any).args.action as CampaignMonitorAction,
        refundedCount: (log as any).args.refundedCount as bigint,
        timestamp: (log as any).args.timestamp as bigint,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      })) as CampaignReportEvent[];

      setEvents((prev) => [...newEvents, ...prev]);
      newEvents.forEach((e) => onEvent?.(e));
    },
  });

  return events;
}

// ═══════════════════════════════════════════════
// Unified CRE Activity Feed
// ═══════════════════════════════════════════════

/**
 * Aggregates events from all 5 CRE receivers into a single
 * sorted activity feed. Accepts an optional onActivity callback
 * that fires for every new event (useful for toast notifications).
 */
export function useCREActivityFeed(
  onActivity?: (item: CREActivityItem) => void,
) {
  const paymentEvents = useWatchPaymentReports((e) => {
    onActivity?.(paymentToActivity(e));
  });

  const complianceEvents = useWatchComplianceReports((e) => {
    onActivity?.(complianceToActivity(e));
  });

  const vehicleEvents = useWatchVehicleReports((e) => {
    onActivity?.(vehicleToActivity(e));
  });

  const onboardingEvents = useWatchOnboardingReports((e) => {
    onActivity?.(onboardingToActivity(e));
  });

  const campaignEvents = useWatchCampaignReports((e) => {
    onActivity?.(campaignToActivity(e));
  });

  const feed = useMemo(() => {
    const items: CREActivityItem[] = [
      ...paymentEvents.map(paymentToActivity),
      ...complianceEvents.map(complianceToActivity),
      ...vehicleEvents.map(vehicleToActivity),
      ...onboardingEvents.map(onboardingToActivity),
      ...campaignEvents.map(campaignToActivity),
    ];
    items.sort((a, b) => {
      const tsDiff = Number(b.timestamp) - Number(a.timestamp);
      if (tsDiff !== 0) return tsDiff;
      return Number(b.blockNumber) - Number(a.blockNumber);
    });
    return items;
  }, [paymentEvents, complianceEvents, vehicleEvents, onboardingEvents, campaignEvents]);

  return {
    feed,
    counts: {
      payment: paymentEvents.length,
      compliance: complianceEvents.length,
      vehicle: vehicleEvents.length,
      onboarding: onboardingEvents.length,
      campaign: campaignEvents.length,
      total: feed.length,
    },
  };
}

// ─── Mapping helpers ───

function paymentToActivity(e: PaymentReportEvent): CREActivityItem {
  return {
    type: "payment",
    label: "Milestone Completed",
    description: `Payment #${e.paymentId} — ${e.milestone}`,
    timestamp: e.timestamp,
    transactionHash: e.transactionHash,
    blockNumber: e.blockNumber,
  };
}

function complianceToActivity(e: ComplianceReportEvent): CREActivityItem {
  return {
    type: "compliance",
    label: COMPLIANCE_ACTION_LABELS[e.action] || `Action ${e.action}`,
    description: `Compliance action processed`,
    timestamp: e.timestamp,
    transactionHash: e.transactionHash,
    blockNumber: e.blockNumber,
  };
}

function vehicleToActivity(e: VehicleReportEvent): CREActivityItem {
  return {
    type: "vehicle",
    label: VEHICLE_ACTION_LABELS[e.action] || `Action ${e.action}`,
    description: `Vehicle #${e.tokenId}`,
    timestamp: e.timestamp,
    transactionHash: e.transactionHash,
    blockNumber: e.blockNumber,
  };
}

function onboardingToActivity(e: OnboardingReportEvent): CREActivityItem {
  return {
    type: "onboarding",
    label: ONBOARDING_ACTION_LABELS[e.action] || `Action ${e.action}`,
    description: `Onboarding request processed`,
    timestamp: e.timestamp,
    transactionHash: e.transactionHash,
    blockNumber: e.blockNumber,
  };
}

function campaignToActivity(e: CampaignReportEvent): CREActivityItem {
  const label = e.action === "CAMPAIGN_FAILED" ? "Campaign Failed" : "Campaign Cancelled";
  return {
    type: "campaign",
    label,
    description: `Vehicle #${e.vehicleId} — ${Number(e.refundedCount)} refunded`,
    timestamp: e.timestamp,
    transactionHash: e.transactionHash,
    blockNumber: e.blockNumber,
  };
}

// ═══════════════════════════════════════════════
// Historical CRE Events (past logs)
// ═══════════════════════════════════════════════

/**
 * Public RPC client for log fetching.
 * Alchemy free tier limits getLogs to 10 blocks, so we use public RPCs
 * with fallback that support wider block ranges for historical event scanning.
 */
const logsClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"),
    http("https://ethereum-sepolia-rpc.publicnode.com"),
    http("https://1rpc.io/sepolia"),
  ]),
});

/**
 * Fetches historical events from all 5 CRE receivers.
 * Scans the last ~50,000 blocks (~7 days on Sepolia).
 * Uses a public RPC (not Alchemy) to avoid getLogs block range limits.
 */
export function useHistoricalCREEvents() {
  const paymentContract = usePaymentReceiver();
  const complianceContract = useComplianceReceiver();
  const vehicleContract = useVehicleReceiver();
  const onboardingContract = useOnboardingReceiver();
  const campaignContract = useCampaignMonitorReceiver();

  const [events, setEvents] = useState<CREActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setError(null);

      try {
        const currentBlock = await logsClient.getBlockNumber();
        // Scan last ~50k blocks (~7 days on Sepolia)
        const scanRange = BigInt(50000);
        const fromBlock = currentBlock > scanRange ? currentBlock - scanRange : BigInt(0);

        const allItems: CREActivityItem[] = [];

        // Fetch from all 5 receivers in parallel using public RPC
        const [paymentLogs, complianceLogs, vehicleLogs, onboardingLogs, campaignLogs] =
          await Promise.all([
            logsClient.getLogs({
              address: paymentContract.address,
              event: {
                type: "event",
                name: "PaymentReportProcessed",
                inputs: [
                  { name: "paymentId", type: "uint256", indexed: true },
                  { name: "milestone", type: "string", indexed: false },
                  { name: "timestamp", type: "uint256", indexed: false },
                ],
              },
              fromBlock,
              toBlock: "latest",
            }).catch(() => []),
            logsClient.getLogs({
              address: complianceContract.address,
              event: {
                type: "event",
                name: "ComplianceReportProcessed",
                inputs: [
                  { name: "action", type: "uint8", indexed: false },
                  { name: "timestamp", type: "uint256", indexed: false },
                ],
              },
              fromBlock,
              toBlock: "latest",
            }).catch(() => []),
            logsClient.getLogs({
              address: vehicleContract.address,
              event: {
                type: "event",
                name: "VehicleReportProcessed",
                inputs: [
                  { name: "action", type: "uint8", indexed: false },
                  { name: "tokenId", type: "uint256", indexed: true },
                  { name: "timestamp", type: "uint256", indexed: false },
                ],
              },
              fromBlock,
              toBlock: "latest",
            }).catch(() => []),
            logsClient.getLogs({
              address: onboardingContract.address,
              event: {
                type: "event",
                name: "OnboardingReportProcessed",
                inputs: [
                  { name: "action", type: "uint8", indexed: false },
                  { name: "timestamp", type: "uint256", indexed: false },
                ],
              },
              fromBlock,
              toBlock: "latest",
            }).catch(() => []),
            logsClient.getLogs({
              address: campaignContract.address,
              event: {
                type: "event",
                name: "CampaignReportProcessed",
                inputs: [
                  { name: "vehicleId", type: "uint256", indexed: true },
                  { name: "action", type: "string", indexed: false },
                  { name: "refundedCount", type: "uint256", indexed: false },
                  { name: "timestamp", type: "uint256", indexed: false },
                ],
              },
              fromBlock,
              toBlock: "latest",
            }).catch(() => []),
          ]);

        // Map payment events
        for (const log of paymentLogs) {
          const args = (log as any).args;
          if (!args) continue;
          allItems.push(paymentToActivity({
            paymentId: args.paymentId,
            milestone: args.milestone,
            timestamp: args.timestamp,
            transactionHash: log.transactionHash as `0x${string}`,
            blockNumber: log.blockNumber,
          }));
        }

        // Map compliance events
        for (const log of complianceLogs) {
          const args = (log as any).args;
          if (!args) continue;
          allItems.push(complianceToActivity({
            action: Number(args.action) as ComplianceAction,
            timestamp: args.timestamp,
            transactionHash: log.transactionHash as `0x${string}`,
            blockNumber: log.blockNumber,
          }));
        }

        // Map vehicle events
        for (const log of vehicleLogs) {
          const args = (log as any).args;
          if (!args) continue;
          allItems.push(vehicleToActivity({
            action: Number(args.action) as VehicleAction,
            tokenId: args.tokenId,
            timestamp: args.timestamp,
            transactionHash: log.transactionHash as `0x${string}`,
            blockNumber: log.blockNumber,
          }));
        }

        // Map onboarding events
        for (const log of onboardingLogs) {
          const args = (log as any).args;
          if (!args) continue;
          allItems.push(onboardingToActivity({
            action: Number(args.action) as OnboardingAction,
            timestamp: args.timestamp,
            transactionHash: log.transactionHash as `0x${string}`,
            blockNumber: log.blockNumber,
          }));
        }

        // Map campaign events
        for (const log of campaignLogs) {
          const args = (log as any).args;
          if (!args) continue;
          allItems.push(campaignToActivity({
            vehicleId: args.vehicleId,
            action: args.action as CampaignMonitorAction,
            refundedCount: args.refundedCount,
            timestamp: args.timestamp,
            transactionHash: log.transactionHash as `0x${string}`,
            blockNumber: log.blockNumber,
          }));
        }

        // Sort by block number descending
        allItems.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
        setEvents(allItems);
      } catch (err: any) {
        setError(err.message || "Failed to fetch historical events");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, [paymentContract.address, complianceContract.address, vehicleContract.address, onboardingContract.address, campaignContract.address]);

  return { events, isLoading, error };
}
