"use client";

import { useState, useEffect } from "react";
import { Vehicle } from "@/types";
import {
  Card,
  Button,
  Input,
  Progress,
  Separator,
} from "@/components/ui";
import { EthUsdDisplay } from "@/components/web3";
import { toast } from "react-hot-toast";
import {
  useInitiateVehicleInvestment,
  useEscrowFee,
  useCanInvestInVehicle,
  usePaymentSettings,
  useVehicleInvestmentTotal,
  useVehiclePayments,
  useRentorCoInvestment,
} from "@/hooks/useInvestment";
import { investmentApi } from "@/lib/api";
import { useEthPrice, useEthToUsd, useUsdToEth } from "@/hooks/usePriceFeed";
import { formatCurrency } from "@/lib/utils";
import { useIsUserVerified } from "@/hooks/useIdentity";
import { useAccount, useReadContract } from "wagmi";
import { parseEther, formatEther } from "viem";

const ERC20_SYMBOL_ABI = [
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
import { useCanInvestorAct } from "@/hooks/useComplianceStatus";
import { useParticipantTypeRegistry } from "@/hooks/useContracts";

export interface InvestmentModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

const REASON_MESSAGES: Record<number, string> = {
  1: "Below minimum investment for your investor type",
  2: "Exceeds maximum investment per vehicle (Retail: 1 ETH)",
  3: "Below minimum investment for accredited investors (0.1 ETH)",
  4: "Exceeds maximum total investment for accredited investors (10 ETH)",
  5: "Below minimum investment for institutional investors (1 ETH)",
};

export function InvestmentModal({
  vehicle,
  onClose,
  onSuccess,
}: InvestmentModalProps) {
  const [inputMode, setInputMode] = useState<"ETH" | "USD">("ETH");
  const [amountEth, setAmountEth] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { isConnected, address: walletAddress } = useAccount();
  const { invest, isConfirming, isSuccess, hash, error: txError, isPending } = useInitiateVehicleInvestment();
  const { canAct: canInvest, reason: complianceReason } = useCanInvestorAct();
  const { price: ethPrice } = useEthPrice();

  // On-chain pre-flight checks — must complete before invest is allowed
  const { data: isIdentityVerified, isLoading: identityLoading } = useIsUserVerified(walletAddress);
  const participantRegistry = useParticipantTypeRegistry();
  const { data: isInvestorOnChain, isLoading: investorRoleLoading } = useReadContract({
    address: participantRegistry.address,
    abi: participantRegistry.abi,
    functionName: "isInvestor",
    args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
    query: { enabled: !!walletAddress },
  });
  const { minPaymentAmount, maxPaymentAmount } = usePaymentSettings();
  const preflightLoading = walletAddress ? (identityLoading || investorRoleLoading) : false;

  // Read on-chain asset token symbol for display
  const { data: assetTokenSymbol } = useReadContract({
    address: vehicle.assetTokenAddress as `0x${string}`,
    abi: ERC20_SYMBOL_ABI,
    functionName: "symbol",
    query: { enabled: !!vehicle.assetTokenAddress },
  });

  const fundraising = vehicle.fundraising;

  if (!fundraising) {
    return null;
  }

  // Parse ETH amount for calculations
  const ethValue = parseFloat(amountEth) || 0;
  const amountWei = ethValue > 0 ? parseEther(amountEth) : BigInt(0);

  // ETH/USD conversions for display
  const { usd: ethToUsdValue } = useEthToUsd(ethValue);
  const { eth: usdToEthValue } = useUsdToEth(parseFloat(amountUsd) || 0);

  // Escrow fee from contract
  const { data: escrowFeeWei } = useEscrowFee(amountWei > BigInt(0) ? amountWei : undefined);
  const escrowFee = escrowFeeWei ? (escrowFeeWei as bigint) : BigInt(0);
  const totalValueWei = amountWei + escrowFee;

  // On-chain investment limit check
  const vehicleTokenId = vehicle.vehicleNftId != null ? BigInt(vehicle.vehicleNftId) : undefined;
  const { data: canInvestData } = useCanInvestInVehicle(
    vehicleTokenId,
    amountWei > BigInt(0) ? amountWei : undefined
  );
  const canInvestOnChain = canInvestData ? (canInvestData as any)[0] as boolean : true;
  const limitReasonCode = canInvestData ? Number((canInvestData as any)[1]) : 0;

  // On-chain totals (use multiple sources for reliability)
  const { data: vehicleInvestmentTotalWei } = useVehicleInvestmentTotal(vehicleTokenId);
  const { data: onChainCoInvestment } = useRentorCoInvestment(vehicleTokenId);
  const { data: vehiclePaymentIds } = useVehiclePayments(vehicleTokenId);
  const onChainPayments = vehiclePaymentIds as bigint[] | undefined;
  const onChainInvestorCount = onChainPayments?.length ?? 0;

  // Prefer vehicleInvestmentTotal (includes all), fallback to co-investment only
  const investmentTotalEth = vehicleInvestmentTotalWei
    ? parseFloat(formatEther(vehicleInvestmentTotalWei as bigint))
    : 0;
  const coInvestEth = onChainCoInvestment
    ? parseFloat(formatEther(onChainCoInvestment as bigint))
    : 0;
  const totalRaisedEth = investmentTotalEth > 0 ? investmentTotalEth : coInvestEth;
  const totalRaisedUsd = totalRaisedEth * ethPrice;
  const effectiveRaised = totalRaisedUsd > 0 ? totalRaisedUsd : fundraising.currentAmount;
  const effectiveInvestorCount = Math.max(fundraising.investorCount || 0, onChainInvestorCount);
  const fundingPct = fundraising.targetAmount > 0
    ? Math.min((effectiveRaised / fundraising.targetAmount) * 100, 100)
    : 0;

  // Campaign stats
  const estimatedTokens = ethValue > 0 ? ethValue * 100 : 0; // 100 tokens per ETH

  // Validation
  const isValidAmount = ethValue > 0;

  // On-chain pre-flight warnings — prevent transactions that would revert
  const preflightWarnings: string[] = [];
  if (walletAddress && vehicle.ownerAddress && walletAddress.toLowerCase() === vehicle.ownerAddress.toLowerCase()) {
    preflightWarnings.push("You cannot invest in your own vehicle. The contract blocks self-investment (CannotPaySelf). Use a different investor wallet, or use the rentor co-investment on your vehicle management page instead.");
  }
  if (walletAddress && isIdentityVerified === false) {
    preflightWarnings.push("Your identity is not verified on-chain (IdentityRegistry). Contact admin to verify your identity.");
  }
  if (walletAddress && isInvestorOnChain === false) {
    preflightWarnings.push("You are not registered as an investor on-chain (ParticipantTypeRegistry). Complete investor onboarding first.");
  }
  if (amountWei > BigInt(0) && minPaymentAmount && amountWei <= minPaymentAmount) {
    preflightWarnings.push(`Amount must be greater than ${formatEther(minPaymentAmount)} ETH (protocol minimum).`);
  }
  if (amountWei > BigInt(0) && maxPaymentAmount && amountWei >= maxPaymentAmount) {
    preflightWarnings.push(`Amount must be less than ${formatEther(maxPaymentAmount)} ETH (protocol maximum).`);
  }
  const hasPreflightErrors = preflightWarnings.length > 0;

  // Handle input changes with auto-conversion
  const handleEthChange = (value: string) => {
    setAmountEth(value);
    const v = parseFloat(value) || 0;
    if (ethPrice > 0) {
      setAmountUsd((v * ethPrice).toFixed(2));
    }
  };

  const handleUsdChange = (value: string) => {
    setAmountUsd(value);
    const v = parseFloat(value) || 0;
    if (ethPrice > 0) {
      setAmountEth((v / ethPrice).toFixed(6));
    }
  };

  // Handle successful investment — record in backend after on-chain confirmation
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success(`Investment successful! Tx: ${hash.slice(0, 10)}...`);

      // Record investment in MongoDB
      const campaignId = fundraising.campaignId;
      if (campaignId) {
        const usdAmount = ethValue * ethPrice;
        investmentApi
          .create({
            vehicleId: vehicle._id,
            campaignId,
            amount: usdAmount,
            amountEth: ethValue,
            txHash: hash,
          })
          .then(() => {
            console.log("Investment recorded in database");
          })
          .catch((err) => {
            console.error("Failed to record investment in DB:", err);
            toast.error("Investment succeeded on-chain but failed to record. Contact support.");
          });
      }

      onSuccess?.(ethValue);
      onClose();
    }
  }, [isSuccess, hash]);

  // Decode and display transaction errors (including gas estimation failures)
  useEffect(() => {
    if (!txError) return;
    // Walk the cause chain to get the deepest error message
    let fullMsg = "";
    let err: unknown = txError;
    while (err) {
      const errMsg = (err as Error).message || "";
      if (errMsg) fullMsg += " " + errMsg;
      err = (err as { cause?: unknown }).cause;
    }
    fullMsg = fullMsg || String(txError);
    console.error("Investment tx error (full):", fullMsg);
    console.error("Investment tx error (raw):", txError);

    const knownReverts: Record<string, string> = {
      IdentityNotVerified: "Your identity is not verified on-chain. Ask admin to verify via IdentityRegistry.",
      ComplianceValidationFailed: "Compliance check failed — not registered as investor or investment limits exceeded.",
      AmountBelowMinimum: "Investment amount is below the protocol minimum.",
      AmountExceedsMaximum: "Investment amount exceeds the protocol maximum.",
      CannotPaySelf: "You cannot invest in your own vehicle.",
      InsufficientBalance: "Insufficient ETH sent (amount + escrow fee).",
      ReasonRequired: "A reason string is required for the investment.",
      OracleAccessDenied: "Oracle access denied for this transaction.",
      InvalidAddress: "Invalid rentor address (zero address).",
    };
    for (const [key, description] of Object.entries(knownReverts)) {
      if (fullMsg.includes(key)) {
        toast.error(description);
        return;
      }
    }
    // Gas estimation blowup = contract revert during eth_estimateGas
    if (fullMsg.includes("gas") && (fullMsg.includes("exceeds") || fullMsg.includes("too high") || fullMsg.includes("reverted"))) {
      toast.error("Transaction would revert on-chain. Check the compliance status section below for details.");
      return;
    }
    if (fullMsg.includes("User rejected") || fullMsg.includes("user rejected")) {
      toast.error("Transaction cancelled by user.");
      return;
    }
    if (fullMsg.includes("execution reverted")) {
      toast.error("Contract execution reverted. Check the compliance status section for details.");
      return;
    }
    toast.error("Investment transaction failed. Check console for details.");
  }, [txError]);

  const handleInvest = async () => {
    if (!isValidAmount || !agreedToTerms) {
      toast.error("Please enter a valid amount and agree to terms");
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!vehicle.vehicleNftId) {
      toast.error("This vehicle is not yet tokenized on-chain. The rentor must register it first.");
      return;
    }

    try {
      invest(
        BigInt(vehicle.vehicleNftId),
        (vehicle.ownerAddress as `0x${string}`) ||
          "0x0000000000000000000000000000000000000000",
        amountWei,
        `Investment in ${vehicle.brand} ${vehicle.model}`,
        totalValueWei,
      );
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
                {vehicle.year} &middot; {vehicle.category} &middot; {vehicle.location}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              &#10005;
            </button>
          </div>

          {/* Live ETH Price */}
          {ethPrice > 0 && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <span className="text-gray-500">ETH/USD:</span>
              <span className="font-semibold text-gray-900">
                ${ethPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-gray-400">(Chainlink)</span>
            </div>
          )}

          {/* Funding Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Funding Progress</span>
              <span className="font-semibold">
                {fundingPct.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={fundingPct}
              variant="default"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(effectiveRaised)} raised
              {totalRaisedEth > 0 && (
                <span className="ml-1">({totalRaisedEth.toFixed(4)} ETH)</span>
              )}
              {" "}&middot; Goal: {formatCurrency(fundraising.targetAmount)}
            </p>
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
                ${fundraising.minInvestment || 100} USD
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Investors</p>
              <p className="text-xl font-bold text-purple-600">
                {effectiveInvestorCount}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Currency Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setInputMode("ETH")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                inputMode === "ETH"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Enter in ETH
            </button>
            <button
              onClick={() => setInputMode("USD")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                inputMode === "USD"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Enter in USD
            </button>
          </div>

          {/* Investment Amount Input */}
          <div className="mb-6">
            {inputMode === "ETH" ? (
              <>
                <Input
                  type="number"
                  label="Investment Amount (ETH)"
                  placeholder="0.01"
                  value={amountEth}
                  onChange={(e) => handleEthChange(e.target.value)}
                  min={0}
                  step="0.001"
                  required
                />
                {ethValue > 0 && ethPrice > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    &#8776; ${ethToUsdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                    USD
                  </p>
                )}
              </>
            ) : (
              <>
                <Input
                  type="number"
                  label="Investment Amount (USD)"
                  placeholder="100.00"
                  value={amountUsd}
                  onChange={(e) => handleUsdChange(e.target.value)}
                  min={0}
                  step="1"
                  required
                />
                {parseFloat(amountUsd) > 0 && ethPrice > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    &#8776; {usdToEthValue.toFixed(6)} ETH
                  </p>
                )}
              </>
            )}
          </div>

          {/* On-chain limit warning */}
          {!canInvestOnChain && limitReasonCode > 0 && amountWei > BigInt(0) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Limit Warning:</strong>{" "}
                {REASON_MESSAGES[limitReasonCode] ||
                  "Investment limit exceeded for your investor type"}
              </p>
            </div>
          )}

          {/* Investment Summary */}
          {isValidAmount && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">Investment Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Investment Amount</span>
                <EthUsdDisplay amountEth={ethValue} primary="ETH" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Escrow Fee (0.1%)</span>
                <EthUsdDisplay amountWei={escrowFee} primary="ETH" />
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-900">Total Payment</span>
                <EthUsdDisplay amountWei={totalValueWei} primary="ETH" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Tokens</span>
                <span className="font-semibold text-blue-600">
                  {estimatedTokens.toLocaleString()} {(assetTokenSymbol as string) || "tokens"}
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
              , understand the risks involved, and confirm that I meet the investor requirements.
            </label>
          </div>

          {/* On-chain Compliance Status (always visible when wallet connected) */}
          {walletAddress && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 mb-2">On-chain Compliance Status:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span>{isIdentityVerified === true ? "\u2705" : isIdentityVerified === false ? "\u274C" : "\u23F3"}</span>
                  <span className="text-gray-700">Identity Verified</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{isInvestorOnChain === true ? "\u2705" : isInvestorOnChain === false ? "\u274C" : "\u23F3"}</span>
                  <span className="text-gray-700">Investor Role</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{canInvestOnChain ? "\u2705" : amountWei > BigInt(0) && !canInvestOnChain ? "\u274C" : "\u2796"}</span>
                  <span className="text-gray-700">Investment Limits</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{canInvest ? "\u2705" : "\u274C"}</span>
                  <span className="text-gray-700">KYC Approved</span>
                </div>
              </div>
            </div>
          )}

          {/* On-chain Pre-flight Warnings */}
          {hasPreflightErrors && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
              <p className="text-sm font-semibold text-red-800">On-chain Compliance Issues:</p>
              {preflightWarnings.map((w, i) => (
                <p key={i} className="text-sm text-red-700">• {w}</p>
              ))}
            </div>
          )}

          {/* Compliance Warning */}
          {!canInvest && complianceReason && !hasPreflightErrors && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Verification Required:</strong> {complianceReason}
              </p>
            </div>
          )}

          {/* Wallet Connection Warning */}
          {!isConnected && canInvest && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Please connect your wallet to invest on-chain
              </p>
            </div>
          )}

          {/* Blockchain Transaction Info */}
          {hash && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Transaction submitted! Hash:{" "}
                <code className="font-mono">
                  {hash.slice(0, 10)}...{hash.slice(-8)}
                </code>
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
              disabled={
                !isValidAmount ||
                !agreedToTerms ||
                !isConnected ||
                isConfirming ||
                isPending ||
                preflightLoading ||
                !canInvest ||
                hasPreflightErrors ||
                (!canInvestOnChain && limitReasonCode > 0)
              }
              className="flex-1"
            >
              {isConfirming || isPending
                ? "Processing..."
                : preflightLoading
                ? "Checking compliance..."
                : hasPreflightErrors
                ? "Compliance Check Failed"
                : !canInvest
                ? "Verification Required"
                : !canInvestOnChain && limitReasonCode > 0
                ? "Limit Exceeded"
                : isValidAmount
                ? `Invest ${ethValue.toFixed(4)} ETH`
                : "Invest Now"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
