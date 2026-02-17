"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Heading, Button } from "@/components/ui";
import {
  useRegisterVehicleTokens,
  useRegisterVehicleRevenue,
  useSetVehicleOperator,
} from "@/hooks/useVehicleSetup";
import { toast } from "react-hot-toast";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";

interface VehicleSetupWizardProps {
  vehicleNftId: bigint;
  assetTokenAddress: `0x${string}`;
  revenueTokenAddress: `0x${string}`;
  rentorAddress: `0x${string}`;
  vehicleName?: string;
  onComplete?: () => void;
}

type StepStatus = "pending" | "in_progress" | "confirming" | "done" | "error";

export default function VehicleSetupWizard({
  vehicleNftId,
  assetTokenAddress,
  revenueTokenAddress,
  rentorAddress,
  vehicleName,
  onComplete,
}: VehicleSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(["pending", "pending", "pending"]);

  const {
    register: registerTokens,
    hash: registerTokensHash,
    isConfirming: isRegisterTokensConfirming,
    isSuccess: registerTokensSuccess,
    isPending: isRegisterTokensPending,
    error: registerTokensError,
  } = useRegisterVehicleTokens();

  const {
    register: registerRevenue,
    hash: registerRevenueHash,
    isConfirming: isRegisterRevenueConfirming,
    isSuccess: registerRevenueSuccess,
    isPending: isRegisterRevenuePending,
    error: registerRevenueError,
  } = useRegisterVehicleRevenue();

  const {
    setOperator,
    hash: setOperatorHash,
    isConfirming: isSetOperatorConfirming,
    isSuccess: setOperatorSuccess,
    isPending: isSetOperatorPending,
    error: setOperatorError,
  } = useSetVehicleOperator();

  const updateStatus = (step: number, status: StepStatus) => {
    setStepStatuses((prev) => {
      const next = [...prev];
      next[step] = status;
      return next;
    });
  };

  // Step 1 complete → auto-start step 2
  useEffect(() => {
    if (registerTokensSuccess && currentStep === 0) {
      updateStatus(0, "done");
      setCurrentStep(1);
      updateStatus(1, "in_progress");
      registerRevenue(vehicleNftId, revenueTokenAddress);
    }
  }, [registerTokensSuccess]);

  // Step 2 complete → auto-start step 3
  useEffect(() => {
    if (registerRevenueSuccess && currentStep === 1) {
      updateStatus(1, "done");
      setCurrentStep(2);
      updateStatus(2, "in_progress");
      setOperator(vehicleNftId, rentorAddress);
    }
  }, [registerRevenueSuccess]);

  // Step 3 complete → all done
  useEffect(() => {
    if (setOperatorSuccess && currentStep === 2) {
      updateStatus(2, "done");
      setCurrentStep(3);
      toast.success("Vehicle token setup complete!");
      onComplete?.();
    }
  }, [setOperatorSuccess]);

  // Error handling
  useEffect(() => {
    if (registerTokensError) {
      updateStatus(0, "error");
      toast.error(registerTokensError.message?.slice(0, 100) || "Failed to register tokens");
    }
  }, [registerTokensError]);

  useEffect(() => {
    if (registerRevenueError) {
      updateStatus(1, "error");
      toast.error(registerRevenueError.message?.slice(0, 100) || "Failed to register on RevenueDistributor");
    }
  }, [registerRevenueError]);

  useEffect(() => {
    if (setOperatorError) {
      updateStatus(2, "error");
      toast.error(setOperatorError.message?.slice(0, 100) || "Failed to set operator");
    }
  }, [setOperatorError]);

  const handleStart = () => {
    updateStatus(0, "in_progress");
    registerTokens(vehicleNftId, assetTokenAddress, revenueTokenAddress);
  };

  const allDone = stepStatuses.every((s) => s === "done");

  const steps = [
    {
      label: "Register tokens on PaymentProtocol",
      hash: registerTokensHash,
      isPending: isRegisterTokensPending,
      isConfirming: isRegisterTokensConfirming,
    },
    {
      label: "Register vehicle on RevenueDistributor",
      hash: registerRevenueHash,
      isPending: isRegisterRevenuePending,
      isConfirming: isRegisterRevenueConfirming,
    },
    {
      label: "Set operator on RevenueDistributor",
      hash: setOperatorHash,
      isPending: isSetOperatorPending,
      isConfirming: isSetOperatorConfirming,
    },
  ];

  return (
    <Card className="mt-4">
      <CardContent className="p-6">
        <Heading as="h3" className="mb-4">
          Token Registration Setup{vehicleName ? ` — ${vehicleName}` : ""}
        </Heading>

        <p className="text-sm text-gray-600 mb-4">
          Register the deployed tokens on-chain so the payment system and revenue distributor can manage them.
        </p>

        <div className="space-y-3 mb-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5">
                {stepStatuses[i] === "done" ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : stepStatuses[i] === "error" ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold">!</span>
                ) : stepStatuses[i] === "in_progress" || stepStatuses[i] === "confirming" ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">{i + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <span className={`text-sm ${stepStatuses[i] === "done" ? "text-green-700" : stepStatuses[i] === "error" ? "text-red-700" : "text-gray-700"}`}>
                  {step.label}
                </span>
                {step.isPending && stepStatuses[i] === "in_progress" && (
                  <span className="block text-xs text-yellow-600 mt-0.5">Confirm in wallet...</span>
                )}
                {step.isConfirming && (
                  <span className="block text-xs text-blue-600 mt-0.5">Confirming on-chain...</span>
                )}
                {step.hash && (
                  <a
                    href={getEtherscanUrl(SEPOLIA_CHAIN_ID, step.hash, "tx")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-500 hover:underline mt-0.5"
                  >
                    {step.hash.slice(0, 14)}...
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {!allDone && currentStep === 0 && stepStatuses[0] === "pending" && (
          <Button onClick={handleStart} className="w-full">
            Start Token Registration
          </Button>
        )}

        {allDone && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-800">
              All token registrations complete. The payment system can now mint tokens when investors fund milestones.
            </p>
          </div>
        )}

        {stepStatuses.some((s) => s === "error") && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
            <p className="text-xs text-red-800">
              A step failed. Only the contract owner (admin) can perform these registrations. Make sure you're connected with the admin wallet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
