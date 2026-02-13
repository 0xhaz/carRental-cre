"use client";

import { useState, useEffect } from "react";
import { Vehicle } from "@/types";
import {
  Card,
  Button,
  Input,
  Badge,
  Progress,
  Separator,
} from "@/components/ui";
import { TransactionButton } from "@/components/web3";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useCreateInvestment } from "@/hooks/useInvestment";
import { useAccount } from "wagmi";
import { useCanInvestorAct } from "@/hooks/useComplianceStatus";

export interface InvestmentModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

export function InvestmentModal({
  vehicle,
  onClose,
  onSuccess,
}: InvestmentModalProps) {
  const [amount, setAmount] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { isConnected } = useAccount();
  const { createInvestment, isConfirming, isSuccess, hash } = useCreateInvestment();
  const { canAct: canInvest, reason: complianceReason } = useCanInvestorAct();

  const fundraising = vehicle.fundraising;

  if (!fundraising) {
    return null;
  }

  const investmentAmount = parseFloat(amount) || 0;
  const minInvestment = 100;
  const remainingAmount = fundraising.targetAmount - fundraising.currentAmount;
  const estimatedTokens = investmentAmount / 10; // $10 per token
  const estimatedAnnualReturn = (investmentAmount * fundraising.expectedROI) / 100;

  const isValidAmount =
    investmentAmount >= minInvestment &&
    investmentAmount <= remainingAmount;

  // Handle successful investment
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success(`Investment successful! Tx: ${hash.slice(0, 10)}...`);
      onSuccess?.(investmentAmount);
      onClose();
    }
  }, [isSuccess, hash, investmentAmount, onSuccess, onClose]);

  const handleInvest = async () => {
    if (!isValidAmount || !agreedToTerms) {
      toast.error("Please enter a valid amount and agree to terms");
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!vehicle.tokenId) {
      toast.error("This vehicle is not yet tokenized on-chain");
      return;
    }

    try {
      // Create on-chain investment
      createInvestment(BigInt(vehicle.tokenId), amount);
    } catch (error) {
      console.error("Investment error:", error);
      toast.error("Investment failed. Please try again.");
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Invest in {vehicle.brand} {vehicle.model}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {vehicle.year} · {vehicle.category} · {vehicle.location}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Funding Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Funding Progress</span>
              <span className="font-semibold">
                {formatCurrency(fundraising.currentAmount)} /{" "}
                {formatCurrency(fundraising.targetAmount)}
              </span>
            </div>
            <Progress
              value={(fundraising.currentAmount / fundraising.targetAmount) * 100}
              variant="default"
            />
          </div>

          {/* Investment Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Expected ROI</p>
              <p className="text-xl font-bold text-blue-600">
                {fundraising.expectedROI}%
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Min. Investment</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(minInvestment)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Remaining</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(remainingAmount)}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Investment Amount Input */}
          <div className="mb-6">
            <Input
              type="number"
              label="Investment Amount"
              placeholder={`Min. ${formatCurrency(minInvestment)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={minInvestment}
              max={remainingAmount}
              required
            />
            <p className="text-xs text-gray-600 mt-2">
              Minimum investment: {formatCurrency(minInvestment)} · Maximum:{" "}
              {formatCurrency(remainingAmount)}
            </p>
          </div>

          {/* Investment Summary */}
          {isValidAmount && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">
                Investment Summary
              </h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Investment Amount</span>
                <span className="font-semibold">{formatCurrency(investmentAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Asset Tokens</span>
                <span className="font-semibold text-blue-600">
                  {estimatedTokens.toLocaleString()} AST
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Annual Return</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(estimatedAnnualReturn)}
                </span>
              </div>
            </div>
          )}

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3 mb-6">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              I agree to the{" "}
              <a href="#" className="text-primary hover:underline">
                terms and conditions
              </a>
              , understand the risks involved, and confirm that I am an accredited
              investor.
            </label>
          </div>

          {/* Compliance Warning */}
          {!canInvest && complianceReason && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                🚫 <strong>Verification Required:</strong> {complianceReason}
              </p>
            </div>
          )}

          {/* Wallet Connection Warning */}
          {!isConnected && canInvest && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Please connect your wallet to invest on-chain
              </p>
            </div>
          )}

          {/* Blockchain Transaction Info */}
          {hash && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Transaction submitted! Hash:{" "}
                <code className="font-mono">{hash.slice(0, 10)}...{hash.slice(-8)}</code>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isConfirming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvest}
              disabled={!isValidAmount || !agreedToTerms || !isConnected || isConfirming || !canInvest}
              className="flex-1"
            >
              {isConfirming ? (
                "Processing..."
              ) : !canInvest ? (
                "Verification Required"
              ) : isValidAmount ? (
                `Invest ${formatCurrency(investmentAmount)}`
              ) : (
                "Invest Now"
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
