"use client";

import { useState } from "react";
import {
  Heading,
  Paragraph,
  Card,
  CardContent,
  Badge,
  Button,
} from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  usePaymentReceiverConfig,
  useComplianceReceiverConfig,
  useVehicleReceiverConfig,
  useOnboardingReceiverConfig,
  useCampaignMonitorConfig,
} from "@/hooks/useCRE";
import {
  usePaymentReceiver,
  useComplianceReceiver,
  useVehicleReceiver,
  useOnboardingReceiver,
  useCampaignMonitorReceiver,
} from "@/hooks/useContracts";
import {
  CRE_WORKFLOWS,
  CRE_DON_CONTRACT,
  CRE_WORKFLOW_LABELS,
  type CREWorkflowKey,
} from "@/constants/cre";
import { SEPOLIA_CONTRACTS } from "@/constants/contracts";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "react-hot-toast";
import Link from "next/link";

// ReceiverTemplate ABI fragment for config setters
const RECEIVER_CONFIG_ABI = [
  {
    name: "setForwarderAddress",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_forwarder", type: "address" }],
    outputs: [],
  },
  {
    name: "setExpectedWorkflowId",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_id", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "setExpectedAuthor",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_author", type: "address" }],
    outputs: [],
  },
  {
    name: "setExpectedWorkflowName",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_name", type: "string" }],
    outputs: [],
  },
] as const;

type ReceiverInfo = {
  key: CREWorkflowKey;
  address: `0x${string}`;
  configHook: () => ReturnType<typeof usePaymentReceiverConfig>;
};

function WorkflowCard({ workflowKey }: { workflowKey: CREWorkflowKey }) {
  const workflow = CRE_WORKFLOWS[workflowKey];
  const label = CRE_WORKFLOW_LABELS[workflowKey];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{workflow.description}</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-gray-500">Workflow Name:</span>{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
              {workflow.name}
            </code>
          </div>
          <div>
            <span className="text-gray-500">Workflow ID:</span>{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 break-all">
              {workflow.workflowId}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Deploy Tx:</span>
            <ExplorerLink value={workflow.deployTxHash} type="tx" className="text-xs" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReceiverConfigCard({
  workflowKey,
  receiverAddress,
}: {
  workflowKey: CREWorkflowKey;
  receiverAddress: `0x${string}`;
}) {
  const workflow = CRE_WORKFLOWS[workflowKey];
  const label = CRE_WORKFLOW_LABELS[workflowKey];

  // Use the appropriate config hook based on workflowKey
  const configHooks: Record<CREWorkflowKey, () => ReturnType<typeof usePaymentReceiverConfig>> = {
    rental: usePaymentReceiverConfig,
    compliance: useComplianceReceiverConfig,
    vehicle: useVehicleReceiverConfig,
    onboarding: useOnboardingReceiverConfig,
    campaign: useCampaignMonitorConfig,
  };
  const config = configHooks[workflowKey]();

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const currentForwarder = config.forwarderAddress;
  const currentWorkflowId = config.expectedWorkflowId;

  const forwarderMatches =
    currentForwarder?.toLowerCase() === CRE_DON_CONTRACT.toLowerCase();
  const workflowIdMatches =
    currentWorkflowId === workflow.workflowId;

  const handleUpdateForwarder = () => {
    writeContract(
      {
        address: receiverAddress,
        abi: RECEIVER_CONFIG_ABI,
        functionName: "setForwarderAddress",
        args: [CRE_DON_CONTRACT],
      },
      {
        onSuccess: () => toast.success(`Updating ${label} forwarder...`),
        onError: (err) => toast.error(err.message.slice(0, 100)),
      },
    );
  };

  const handleUpdateWorkflowId = () => {
    writeContract(
      {
        address: receiverAddress,
        abi: RECEIVER_CONFIG_ABI,
        functionName: "setExpectedWorkflowId",
        args: [workflow.workflowId],
      },
      {
        onSuccess: () => toast.success(`Updating ${label} workflow ID...`),
        onError: (err) => toast.error(err.message.slice(0, 100)),
      },
    );
  };

  return (
    <Card className={isSuccess ? "border-green-200 bg-green-50/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{label} Receiver</h3>
            <ExplorerLink value={receiverAddress} type="address" className="text-xs" />
          </div>
          {forwarderMatches && workflowIdMatches ? (
            <Badge variant="success">Configured</Badge>
          ) : (
            <Badge variant="warning">Needs Update</Badge>
          )}
        </div>

        <div className="space-y-3">
          {/* Forwarder Address */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Forwarder Address</p>
              <p className="text-xs font-mono text-gray-700 truncate">
                {config.isLoading ? "Loading..." : currentForwarder || "Not set"}
              </p>
            </div>
            {!forwarderMatches && !config.isLoading && (
              <Button
                size="sm"
                onClick={handleUpdateForwarder}
                disabled={isPending || isConfirming}
                className="ml-2 shrink-0"
              >
                {isPending || isConfirming ? "Updating..." : "Set CRE DON"}
              </Button>
            )}
            {forwarderMatches && (
              <span className="text-green-600 text-xs font-medium ml-2">Matched</span>
            )}
          </div>

          {/* Workflow ID */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Expected Workflow ID</p>
              <p className="text-xs font-mono text-gray-700 truncate">
                {config.isLoading
                  ? "Loading..."
                  : currentWorkflowId === "0x0000000000000000000000000000000000000000000000000000000000000000"
                    ? "Not set (any workflow)"
                    : currentWorkflowId || "Not set"}
              </p>
            </div>
            {!workflowIdMatches && !config.isLoading && (
              <Button
                size="sm"
                onClick={handleUpdateWorkflowId}
                disabled={isPending || isConfirming}
                className="ml-2 shrink-0"
              >
                {isPending || isConfirming ? "Updating..." : "Set ID"}
              </Button>
            )}
            {workflowIdMatches && (
              <span className="text-green-600 text-xs font-medium ml-2">Matched</span>
            )}
          </div>
        </div>

        {isSuccess && txHash && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-green-700">
              <span>Transaction confirmed:</span>
              <ExplorerLink value={txHash} type="tx" className="text-xs" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CREConfigPage() {
  const workflowKeys: CREWorkflowKey[] = [
    "campaign",
    "compliance",
    "onboarding",
    "rental",
    "vehicle",
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading as="h1" className="mb-2">
              CRE Workflow Configuration
            </Heading>
            <Paragraph>
              Manage Chainlink CRE workflow deployments and receiver contract
              configuration. Update forwarder addresses and workflow IDs to
              connect live workflows to on-chain receivers.
            </Paragraph>
          </div>
          <Link href="/admin/cre-activity">
            <Button variant="outline" size="sm">
              View Activity Feed
            </Button>
          </Link>
        </div>
      </div>

      {/* CRE DON Info */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">CRE DON Contract</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {CRE_DON_CONTRACT}
                </code>
                <ExplorerLink value={CRE_DON_CONTRACT} type="address" className="text-xs" />
              </div>
            </div>
            <Badge variant="success" className="ml-auto">
              5 Workflows Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Deployed Workflows */}
      <div className="mb-8">
        <Heading as="h2" className="mb-4">
          Deployed Workflows
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflowKeys.map((key) => (
            <WorkflowCard key={key} workflowKey={key} />
          ))}
        </div>
      </div>

      {/* Receiver Configuration */}
      <div>
        <Heading as="h2" className="mb-2">
          Receiver Contract Configuration
        </Heading>
        <Paragraph className="mb-4">
          Each receiver must be configured with the CRE DON forwarder address
          and its corresponding workflow ID. Click &quot;Set CRE DON&quot; or &quot;Set ID&quot;
          to send the update transaction.
        </Paragraph>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workflowKeys.map((key) => (
            <ReceiverConfigCard
              key={key}
              workflowKey={key}
              receiverAddress={SEPOLIA_CONTRACTS[CRE_WORKFLOWS[key].receiverKey]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
