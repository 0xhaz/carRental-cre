/**
 * Chainlink CRE Workflow Deployment Constants
 * Deployed by Thomas via CRE Dashboard
 * Last Updated: 2026-03-06
 */

// CRE DON Contract (where workflows are registered)
export const CRE_DON_CONTRACT = "0x4Ac54353FA4Fa961AfcC5ec4B118596d3305E7e5" as const;

// Deployed Workflow Metadata
export const CRE_WORKFLOWS = {
  campaign: {
    name: "campaign-workflow-staging",
    workflowId: "0x006409a30064bc512910663a8e40570769033dc636bbe11a96b8b257b58a7bf6" as `0x${string}`,
    deployTxHash: "0x407421cf2946e9404e5349784b89ba53b453a70654ebfcb88e4c216c6efc8080" as `0x${string}`,
    binaryUrl: "https://storage.cre.chain.link/artifacts/006409a30064bc512910663a8e40570769033dc636bbe11a96b8b257b58a7bf6/binary.wasm",
    configUrl: "https://storage.cre.chain.link/artifacts/006409a30064bc512910663a8e40570769033dc636bbe11a96b8b257b58a7bf6/config",
    description: "Monitors fundraising campaigns for failure/cancellation, triggers batch refunds",
    receiverKey: "campaignMonitorReceiver" as const,
  },
  compliance: {
    name: "compliance-workflow-staging",
    workflowId: "0x00fcb82a6891c72e861b7cec0db06b6970771da4e3437d1d0accfdc4f174862d" as `0x${string}`,
    deployTxHash: "0x33790af21e48df80ddca4c7edf6d749c2a6d0e7d4e1385f814878a74c57f1e77" as `0x${string}`,
    binaryUrl: "https://storage.cre.chain.link/artifacts/00fcb82a6891c72e861b7cec0db06b6970771da4e3437d1d0accfdc4f174862d/binary.wasm",
    configUrl: "https://storage.cre.chain.link/artifacts/00fcb82a6891c72e861b7cec0db06b6970771da4e3437d1d0accfdc4f174862d/config",
    description: "Monitors registration/insurance expiry, maintenance, and renter blacklisting",
    receiverKey: "complianceReceiver" as const,
  },
  onboarding: {
    name: "onboarding-workflow-staging",
    workflowId: "0x00947bb6b052ec424fac8f2f907a6319d7b8d88d49a2128509725ea32aad1af7" as `0x${string}`,
    deployTxHash: "0x2d4957e818560de95ef05fb62ee10efa7a04ac7d33ffe7470878dc5271adc04b" as `0x${string}`,
    binaryUrl: "https://storage.cre.chain.link/artifacts/00947bb6b052ec424fac8f2f907a6319d7b8d88d49a2128509725ea32aad1af7/binary.wasm",
    configUrl: "https://storage.cre.chain.link/artifacts/00947bb6b052ec424fac8f2f907a6319d7b8d88d49a2128509725ea32aad1af7/config",
    description: "Auto-approves/rejects investors and bookings based on ERC-3643 compliance",
    receiverKey: "onboardingReceiver" as const,
  },
  rental: {
    name: "rental-workflow-staging",
    workflowId: "0x00b2f66e724455d8493cf569cddb0f80b8502880bfdc3b21b5037ef0e7b3ade0" as `0x${string}`,
    deployTxHash: "0x5ddfe7c2f18889af3fd33c4aab74510d86428d7de67c0a2d6ec48621b14fef71" as `0x${string}`,
    binaryUrl: "https://storage.cre.chain.link/artifacts/00b2f66e724455d8493cf569cddb0f80b8502880bfdc3b21b5037ef0e7b3ade0/binary.wasm",
    configUrl: "https://storage.cre.chain.link/artifacts/00b2f66e724455d8493cf569cddb0f80b8502880bfdc3b21b5037ef0e7b3ade0/config",
    description: "Verifies investment payment milestones using NHTSA VIN decoder",
    receiverKey: "paymentReceiver" as const,
  },
  vehicle: {
    name: "vehicle-workflow-staging",
    workflowId: "0x0046ecfd166905617d28c7b7b0a02ee60d27d2d77343716a348414f5c8f7cf42" as `0x${string}`,
    deployTxHash: "0x5953ce33fa0ff977a827c4875ef87e9e417132ac23c6e91e296cca5dc40de31b" as `0x${string}`,
    binaryUrl: "https://storage.cre.chain.link/artifacts/0046ecfd166905617d28c7b7b0a02ee60d27d2d77343716a348414f5c8f7cf42/binary.wasm",
    configUrl: "https://storage.cre.chain.link/artifacts/0046ecfd166905617d28c7b7b0a02ee60d27d2d77343716a348414f5c8f7cf42/config",
    description: "Monitors vehicle telematics — mileage, maintenance, and incidents",
    receiverKey: "vehicleReceiver" as const,
  },
} as const;

export type CREWorkflowKey = keyof typeof CRE_WORKFLOWS;

// Workflow display names
export const CRE_WORKFLOW_LABELS: Record<CREWorkflowKey, string> = {
  campaign: "Campaign Monitor",
  compliance: "Compliance",
  onboarding: "Onboarding",
  rental: "Rental (Payment)",
  vehicle: "Vehicle Telematics",
};

// Map workflow keys to receiver contract keys (for cross-referencing)
export const WORKFLOW_RECEIVER_MAP: Record<CREWorkflowKey, keyof import("./contracts").ContractAddresses> = {
  campaign: "campaignMonitorReceiver",
  compliance: "complianceReceiver",
  onboarding: "onboardingReceiver",
  rental: "paymentReceiver",
  vehicle: "vehicleReceiver",
};
