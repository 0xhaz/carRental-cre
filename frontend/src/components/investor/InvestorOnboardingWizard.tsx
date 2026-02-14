"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { EthUsdDisplay } from "@/components/web3";
import {
  useMyInvestorRequest,
  useRequestInvestorStatus,
  useLockFundsDirect,
  useConfirmTokensLocked,
  useWithdrawDirectLock,
  useLockRequirement,
} from "@/hooks/useInvestment";
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
  const { isConnected } = useAccount();
  const { data: request, refetch: refetchRequest } = useMyInvestorRequest();

  // Extract request fields — tuple: (type, requiredLock, wallet, status, createdAt, approvedAt, reason)
  const requestType = request ? Number((request as any)[0]) : 0;
  const requiredLock = request ? ((request as any)[1] as bigint) : BigInt(0);
  const multiSigWallet = request ? ((request as any)[2] as string) : "";
  const status = request ? Number((request as any)[3]) : STATUS.NONE;
  const rejectionReason = request ? ((request as any)[6] as string) : "";

  // Determine effective type: from contract if request exists, otherwise from prop
  const effectiveType = requestType > 0 ? requestType : investorType;
  const isRetail = effectiveType === 1;

  // Get lock requirement from contract
  const { data: lockRequirement } = useLockRequirement(effectiveType);
  const lockAmountWei = lockRequirement as bigint | undefined;

  // Transaction hooks
  const {
    requestStatus,
    isConfirming: isRequesting,
    isSuccess: requestSuccess,
  } = useRequestInvestorStatus();

  const {
    lockFunds,
    isConfirming: isLocking,
    isSuccess: lockSuccess,
  } = useLockFundsDirect();

  const {
    confirmLocked,
    isConfirming: isConfirmingLock,
    isSuccess: confirmSuccess,
  } = useConfirmTokensLocked();

  const {
    withdraw,
    isConfirming: isWithdrawing,
    isSuccess: withdrawSuccess,
  } = useWithdrawDirectLock();

  // Refetch status when transactions succeed
  useEffect(() => {
    if (requestSuccess || lockSuccess || confirmSuccess || withdrawSuccess) {
      const timer = setTimeout(() => refetchRequest(), 3000);
      return () => clearTimeout(timer);
    }
  }, [requestSuccess, lockSuccess, confirmSuccess, withdrawSuccess, refetchRequest]);

  // Show success toasts
  useEffect(() => {
    if (requestSuccess) toast.success("Investor status requested on-chain!");
    if (lockSuccess) toast.success("Funds locked successfully!");
    if (confirmSuccess) toast.success("Token lock confirmed!");
    if (withdrawSuccess) toast.success("Lock withdrawn successfully!");
  }, [requestSuccess, lockSuccess, confirmSuccess, withdrawSuccess]);

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
          {isRetail && (
            <Button variant="ghost" size="sm" onClick={() => withdraw()} disabled={isWithdrawing}>
              {isWithdrawing ? "Withdrawing..." : "Withdraw Lock"}
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
            {isRetail && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => withdraw()}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw Lock"}
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
            <Button
              onClick={() => requestStatus(effectiveType)}
              disabled={isRequesting}
              className="w-full"
            >
              {isRequesting ? "Submitting Transaction..." : "Request Investor Status"}
            </Button>
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
              disabled={isLocking || !lockAmountWei}
              className="w-full"
            >
              {isLocking ? "Locking Funds..." : "Lock Funds (Send ETH)"}
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
              <strong>Step 3:</strong> Send the required lock amount to your MultiSig wallet, then
              confirm.
            </p>
            {multiSigWallet && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">MultiSig Wallet Address:</p>
                <p className="font-mono text-sm break-all text-gray-900">{multiSigWallet}</p>
              </div>
            )}
            {lockAmountWei && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Amount to send &amp; lock:</p>
                <EthUsdDisplay amountWei={lockAmountWei} primary="ETH" />
              </div>
            )}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                1. Send {lockAmountWei ? formatEther(lockAmountWei) : "..."} ETH to the MultiSig
                address above
                <br />
                2. Call <code>lockFunds()</code> on the MultiSig wallet
                <br />
                3. Then click the button below to confirm
              </p>
            </div>
            <Button
              onClick={() => confirmLocked()}
              disabled={isConfirmingLock}
              className="w-full"
            >
              {isConfirmingLock ? "Confirming..." : "Confirm Tokens Locked"}
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
