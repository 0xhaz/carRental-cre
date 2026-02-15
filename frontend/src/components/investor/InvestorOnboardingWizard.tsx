"use client";

import { useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { EthUsdDisplay } from "@/components/web3";
import {
  useMyInvestorRequest,
  useRequestInvestorStatus,
  useLockFundsDirect,
  useConfirmTokensLocked,
  useWithdrawDirectLock,
  useLockRequirement,
  useDirectLockBalance,
  useMultiSigLockedBalance,
  useMultiSigLockFunds,
} from "@/hooks/useInvestment";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import { useInvestorTypeRegistry } from "@/hooks/useContracts";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";

// InvestorRequest status enum from contract
const STATUS = {
  NONE: 0,
  PENDING: 1,
  WALLETCREATED: 2,
  TOKENSLOCKED: 3,
  APPROVED: 4,
  REJECTED: 5,
} as const;

const TYPE_LABELS: Record<number, string> = {
  1: "Retail",
  2: "Accredited",
  3: "Institutional",
};

interface InvestorOnboardingWizardProps {
  /** Investor type (1=RETAIL, 2=ACCREDITED, 3=INSTITUTIONAL) */
  investorType?: number;
  /** Compact mode for dashboard banner */
  compact?: boolean;
}

/**
 * Post-KYC onboarding wizard that guides investors through locking funds on-chain.
 * Reads current status from InvestorRequestManager contract and shows the appropriate step.
 */
export function InvestorOnboardingWizard({
  investorType = 1,
  compact = false,
}: InvestorOnboardingWizardProps) {
  const { isConnected, address: userAddress } = useAccount();
  const { isVerifiedOnChain, isKYCApproved, kycStatus, isLoading: isComplianceLoading } = useComplianceStatus();
  const { data: request, refetch: refetchRequest } = useMyInvestorRequest();
  const { address: investorTypeRegistryAddr, abi: investorTypeAbi } = useInvestorTypeRegistry();

  // Read the investor's actual on-chain type from InvestorTypeRegistry
  const { data: registryTypeRaw } = useReadContract({
    address: investorTypeRegistryAddr,
    abi: investorTypeAbi,
    functionName: "getInvestorType",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });
  const registryType = registryTypeRaw !== undefined ? Number(registryTypeRaw) : 0;

  // Extract request fields — tuple: (type, requiredLock, wallet, status, createdAt, approvedAt, reason)
  const requestType = request ? Number((request as any)[0]) : 0;
  const requiredLock = request ? ((request as any)[1] as bigint) : BigInt(0);
  const multiSigWallet = request ? ((request as any)[2] as string) : "";
  const rawStatus = request ? Number((request as any)[3]) : STATUS.NONE;
  const rejectionReason = request ? ((request as any)[6] as string) : "";

  // If investor already has a non-NORMAL type on-chain but no request in this contract
  // (e.g. after contract redeployment), treat them as APPROVED
  const status = (rawStatus === STATUS.NONE && registryType > 0) ? STATUS.APPROVED : rawStatus;

  // Determine effective type: from registry if set, otherwise from contract request, otherwise from prop
  const effectiveType = registryType > 0 ? registryType : requestType > 0 ? requestType : investorType;
  const isRetail = effectiveType === 1;

  // Get lock requirement from contract
  const { data: lockRequirement } = useLockRequirement(effectiveType);
  const lockAmountWei = lockRequirement as bigint | undefined;

  // Transaction hooks
  const {
    requestStatus,
    isConfirming: isRequesting,
    isSuccess: requestSuccess,
    isPending: isRequestPending,
    error: requestError,
  } = useRequestInvestorStatus();

  const {
    lockFunds,
    isConfirming: isLocking,
    isSuccess: lockSuccess,
    isPending: isLockPending,
    error: lockError,
  } = useLockFundsDirect();

  const {
    confirmLocked,
    isConfirming: isConfirmingLock,
    isSuccess: confirmSuccess,
    isPending: isConfirmPending,
    error: confirmError,
  } = useConfirmTokensLocked();

  const {
    withdraw,
    isConfirming: isWithdrawing,
    isSuccess: withdrawSuccess,
    isPending: isWithdrawPending,
    error: withdrawError,
  } = useWithdrawDirectLock();

  const { data: directLockRaw } = useDirectLockBalance(userAddress as `0x${string}` | undefined);
  const hasDirectLock = directLockRaw !== undefined && (directLockRaw as bigint) > BigInt(0);

  // MultiSig wallet hooks for ACCREDITED/INSTITUTIONAL
  const {
    lockedAmount: multiSigLocked,
    refetch: refetchLockedBalance,
  } = useMultiSigLockedBalance(multiSigWallet);

  const {
    lockFundsInMultiSig,
    isConfirming: isMultiSigLocking,
    isSuccess: multiSigLockSuccess,
    isPending: isMultiSigLockPending,
    error: multiSigLockError,
  } = useMultiSigLockFunds();

  const hasSufficientLock = multiSigLocked !== undefined && requiredLock > BigInt(0) && multiSigLocked >= requiredLock;

  // Refetch status when transactions succeed
  useEffect(() => {
    if (requestSuccess || lockSuccess || confirmSuccess || withdrawSuccess || multiSigLockSuccess) {
      const timer = setTimeout(() => {
        refetchRequest();
        refetchLockedBalance();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [requestSuccess, lockSuccess, confirmSuccess, withdrawSuccess, multiSigLockSuccess, refetchRequest, refetchLockedBalance]);

  // Show success toasts
  useEffect(() => {
    if (requestSuccess) toast.success("Investor status requested on-chain!");
    if (lockSuccess) toast.success("Funds locked successfully!");
    if (confirmSuccess) toast.success("Token lock confirmed!");
    if (withdrawSuccess) toast.success("Lock withdrawn successfully!");
    if (multiSigLockSuccess) toast.success("Funds locked in MultiSig wallet!");
  }, [requestSuccess, lockSuccess, confirmSuccess, withdrawSuccess, multiSigLockSuccess]);

  // Show error toasts
  useEffect(() => {
    const err = requestError || lockError || confirmError || withdrawError || multiSigLockError;
    if (err) {
      const msg = (err as any)?.shortMessage || (err as any)?.message || "Transaction failed";
      toast.error(msg);
      console.error("Onboarding transaction error:", err);
    }
  }, [requestError, lockError, confirmError, withdrawError, multiSigLockError]);

  if (!isConnected) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#128279;</span>
            <div>
              <p className="font-semibold text-gray-900">Connect Your Wallet</p>
              <p className="text-sm text-gray-600">
                Connect your wallet to complete investor onboarding and start investing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // APPROVED — show verified badge
  if (status === STATUS.APPROVED) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="success">Verified {TYPE_LABELS[effectiveType]} Investor</Badge>
          {isRetail && hasDirectLock && (
            <Button variant="ghost" size="sm" onClick={() => withdraw()} disabled={isWithdrawPending || isWithdrawing}>
              {isWithdrawPending ? "Confirm..." : isWithdrawing ? "Withdrawing..." : "Withdraw Lock"}
            </Button>
          )}
        </div>
      );
    }

    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">&#9989;</span>
              <div>
                <p className="font-bold text-green-800 text-lg">
                  Verified {TYPE_LABELS[effectiveType]} Investor
                </p>
                <p className="text-sm text-green-700">
                  You are approved to invest in vehicles on the platform.
                </p>
              </div>
            </div>
            {isRetail && hasDirectLock && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => withdraw()}
                disabled={isWithdrawPending || isWithdrawing}
              >
                {isWithdrawPending ? "Confirm in Wallet..." : isWithdrawing ? "Withdrawing..." : "Withdraw Lock"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // REJECTED
  if (status === STATUS.REJECTED) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">&#10060;</span>
            <div>
              <p className="font-bold text-red-800">Investor Request Rejected</p>
              {rejectionReason && (
                <p className="text-sm text-red-700 mt-1">Reason: {rejectionReason}</p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                Please contact support or resubmit your verification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active onboarding flow
  return (
    <Card className="border-blue-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Investor Onboarding</h3>
          <Badge variant="primary">{TYPE_LABELS[effectiveType]}</Badge>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(isRetail ? [1, 2, 3] : [1, 2, 3, 4, 5]).map((step) => {
            const currentStep = getCurrentStep(status, isRetail);
            const isComplete = step < currentStep;
            const isCurrent = step === currentStep;
            return (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isComplete
                      ? "bg-green-500 text-white"
                      : isCurrent
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isComplete ? "\u2713" : step}
                </div>
                {step < (isRetail ? 3 : 5) && (
                  <div
                    className={`flex-1 h-1 rounded ${
                      isComplete ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* STEP: Request Investor Status (status === NONE) */}
        {status === STATUS.NONE && (
          <div>
            <p className="text-gray-700 mb-3">
              <strong>Step 1:</strong> Request your {TYPE_LABELS[effectiveType].toLowerCase()}{" "}
              investor status on-chain.
            </p>
            {lockAmountWei && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Lock requirement:</p>
                <EthUsdDisplay amountWei={lockAmountWei} primary="ETH" />
              </div>
            )}

            {/* Gate on on-chain identity verification */}
            {!isVerifiedOnChain && !isComplianceLoading && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Identity Not Registered On-Chain:</strong>{" "}
                  {!isKYCApproved
                    ? kycStatus === "pending" || kycStatus === "under_review"
                      ? "Your KYC is under review. Once approved, the admin will register your identity on-chain."
                      : "Please complete KYC verification first."
                    : "Your KYC is approved. Waiting for admin to register your identity on the blockchain."}
                </p>
              </div>
            )}

            <Button
              onClick={() => requestStatus(effectiveType)}
              disabled={isRequestPending || isRequesting || !isVerifiedOnChain}
              className="w-full"
            >
              {isRequestPending
                ? "Confirm in Wallet..."
                : isRequesting
                ? "Confirming on-chain..."
                : !isVerifiedOnChain
                ? "Awaiting On-Chain Verification"
                : "Request Investor Status"}
            </Button>
            {requestError && (
              <p className="text-sm text-red-600 mt-2">
                {(requestError as any)?.shortMessage || "Transaction failed. Please try again."}
              </p>
            )}
          </div>
        )}

        {/* STEP: PENDING — depends on type */}
        {status === STATUS.PENDING && isRetail && (
          <div>
            <p className="text-gray-700 mb-3">
              <strong>Step 2:</strong> Lock the required funds to prove commitment.
            </p>
            {lockAmountWei && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Amount to lock:</p>
                <EthUsdDisplay amountWei={lockAmountWei} primary="ETH" />
              </div>
            )}
            <Button
              onClick={() => {
                if (lockAmountWei) {
                  lockFunds(formatEther(lockAmountWei));
                }
              }}
              disabled={isLockPending || isLocking || !lockAmountWei}
              className="w-full"
            >
              {isLockPending
                ? "Confirm in Wallet..."
                : isLocking
                ? "Confirming on-chain..."
                : "Lock Funds (Send ETH)"}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Funds can be withdrawn after approval.
            </p>
          </div>
        )}

        {status === STATUS.PENDING && !isRetail && (
          <div>
            <p className="text-gray-700 mb-3">
              <strong>Step 2:</strong> Waiting for admin to create your MultiSig wallet.
            </p>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-yellow-800">
                  Your request is pending admin review. A MultiSig wallet will be created for you.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP: WALLETCREATED — ACCREDITED/INSTITUTIONAL only */}
        {status === STATUS.WALLETCREATED && (
          <div>
            <p className="text-gray-700 mb-3">
              <strong>Step 3:</strong> Lock the required funds in your MultiSig wallet.
            </p>
            {multiSigWallet && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">MultiSig Wallet:</p>
                <p className="font-mono text-sm break-all text-gray-900">{multiSigWallet}</p>
              </div>
            )}
            {lockAmountWei && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Required lock amount:</p>
                <EthUsdDisplay amountWei={lockAmountWei} primary="ETH" />
              </div>
            )}

            {/* Lock status indicator */}
            <div className={`mb-4 p-3 rounded-lg border ${hasSufficientLock ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
              <p className={`text-sm font-medium ${hasSufficientLock ? "text-green-800" : "text-yellow-800"}`}>
                {hasSufficientLock
                  ? `Locked: ${formatEther(multiSigLocked!)} ETH — Ready to confirm!`
                  : `Locked: ${multiSigLocked !== undefined ? formatEther(multiSigLocked) : "0"} ETH — Funds not yet locked`}
              </p>
            </div>

            {/* Lock Funds button (step 1) */}
            {!hasSufficientLock && (
              <Button
                onClick={() => {
                  if (lockAmountWei && multiSigWallet) {
                    lockFundsInMultiSig(multiSigWallet, formatEther(lockAmountWei));
                  }
                }}
                disabled={isMultiSigLockPending || isMultiSigLocking || !lockAmountWei || !multiSigWallet}
                className="w-full mb-3"
              >
                {isMultiSigLockPending
                  ? "Confirm in Wallet..."
                  : isMultiSigLocking
                  ? "Locking funds..."
                  : `Lock ${lockAmountWei ? formatEther(lockAmountWei) : "..."} ETH in MultiSig`}
              </Button>
            )}

            {/* Confirm button (step 2 — only enabled after sufficient lock) */}
            <Button
              onClick={() => confirmLocked()}
              disabled={isConfirmPending || isConfirmingLock || !hasSufficientLock}
              variant={hasSufficientLock ? "default" : "outline"}
              className="w-full"
            >
              {isConfirmPending
                ? "Confirm in Wallet..."
                : isConfirmingLock
                ? "Confirming on-chain..."
                : hasSufficientLock
                ? "Confirm Tokens Locked"
                : "Lock funds first to confirm"}
            </Button>
          </div>
        )}

        {/* STEP: TOKENSLOCKED — waiting for approval */}
        {status === STATUS.TOKENSLOCKED && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-500">&#10003;</span>
              <p className="text-green-700 font-semibold">Funds Successfully Locked</p>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-yellow-800">
                  Awaiting admin approval. You'll be notified once your investor status is
                  confirmed.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Map contract status to a step number for the progress indicator */
function getCurrentStep(status: number, isRetail: boolean): number {
  if (isRetail) {
    switch (status) {
      case STATUS.NONE:
        return 1;
      case STATUS.PENDING:
        return 2;
      case STATUS.TOKENSLOCKED:
        return 3;
      case STATUS.APPROVED:
        return 4;
      default:
        return 1;
    }
  }
  // ACCREDITED / INSTITUTIONAL
  switch (status) {
    case STATUS.NONE:
      return 1;
    case STATUS.PENDING:
      return 2;
    case STATUS.WALLETCREATED:
      return 3;
    case STATUS.TOKENSLOCKED:
      return 4;
    case STATUS.APPROVED:
      return 6;
    default:
      return 1;
  }
}
