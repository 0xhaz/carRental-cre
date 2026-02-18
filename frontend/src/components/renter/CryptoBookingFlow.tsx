"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Button, Separator } from "@/components/ui";
import { useCreateRentalBookingPayment } from "@/hooks/useRentalOperations";
import { useAccount, useReadContract } from "wagmi";
import { parseEther, formatEther, keccak256, toHex } from "viem";
import { toast } from "react-hot-toast";
import { bookingApi } from "@/lib/api";
import { Vehicle } from "@/types";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import { useParticipantTypeRegistry, useIdentityRegistry, useRenterComplianceContract } from "@/hooks/useContracts";
import { useValidateRenter } from "@/hooks/useCompliance";
import { SEPOLIA_CONTRACTS } from "@/constants/contracts";

interface CryptoBookingFlowProps {
  vehicle: Vehicle;
  bookingId: string;
  pickupDate: string;
  returnDate: string;
  totalPriceUsd: number;
  onComplete?: (txHash: string) => void;
}

export default function CryptoBookingFlow({
  vehicle,
  bookingId,
  pickupDate,
  returnDate,
  totalPriceUsd,
  onComplete,
}: CryptoBookingFlowProps) {
  const { address: walletAddress } = useAccount();
  const [isSaving, setIsSaving] = useState(false);
  const [premiumCoverage, setPremiumCoverage] = useState(false);
  const compliance = useComplianceStatus();

  // On-chain compliance pre-flight checks
  const { address: ptrAddress, abi: ptrAbi } = useParticipantTypeRegistry();
  const { address: irAddress, abi: irAbi } = useIdentityRegistry();
  const { address: rcAddress, abi: rcAbi } = useRenterComplianceContract();

  // Detect IdentityRegistry mismatch in RenterCompliance contract
  const { data: rcIdentityRegistry } = useReadContract({
    address: rcAddress,
    abi: rcAbi,
    functionName: "identityRegistry",
  });
  const hasRegistryMismatch = rcIdentityRegistry
    && (rcIdentityRegistry as string).toLowerCase() !== SEPOLIA_CONTRACTS.identityRegistry.toLowerCase();

  // Full renter compliance validation (only reliable when no registry mismatch)
  const { data: renterValidation } = useValidateRenter(walletAddress);

  // Direct identity & renter role checks (always reliable — uses frontend registry addresses)
  const { data: isIdentityVerified } = useReadContract({
    address: irAddress,
    abi: irAbi,
    functionName: "isVerified",
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!walletAddress },
  });
  const { data: isRenterOnChain } = useReadContract({
    address: ptrAddress,
    abi: ptrAbi,
    functionName: "isRenter",
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!walletAddress },
  });

  // Check vehicle owner (rentor) is registered on-chain
  const ownerAddr = vehicle.ownerAddress as `0x${string}` | undefined;
  const { data: isRentorOnChain } = useReadContract({
    address: ptrAddress,
    abi: ptrAbi,
    functionName: "isRentor",
    args: ownerAddr ? [ownerAddr] : undefined,
    query: { enabled: !!ownerAddr },
  });

  // Map RenterValidationReason enum to human-readable messages
  const validationReasonMessages: Record<number, string> = {
    1: "Age requirement not met (minimum 21)",
    2: "Driver's license expired",
    3: "Driver's license suspended",
    4: "No driver's license on file",
    5: "Insurance not verified on-chain",
    6: "Insurance expired",
    7: "Credit score insufficient",
    8: "Too many recent incidents",
    9: "Renter is blacklisted",
    10: "Identity not verified on-chain",
  };

  // Build compliance issues list
  const complianceIssues: string[] = [];
  if (!compliance.isKYCApproved) {
    complianceIssues.push("KYC verification not approved");
  }

  if (hasRegistryMismatch) {
    // Registry mismatch: validateRenter is unreliable, use direct checks instead
    complianceIssues.push(
      "RenterCompliance contract has wrong IdentityRegistry — admin must fix this in Admin > KYC panel"
    );
  } else if (walletAddress && renterValidation) {
    // No mismatch: use the full compliance validation
    const result = renterValidation as { isValid: boolean; reason: number };
    if (!result.isValid) {
      const reasonMsg = validationReasonMessages[result.reason] || "Renter compliance check failed";
      complianceIssues.push(reasonMsg);
    }
  }

  // Direct checks (always apply regardless of mismatch)
  if (walletAddress && isIdentityVerified === false) {
    complianceIssues.push("Identity not verified on-chain (admin registration pending)");
  }
  if (walletAddress && isRenterOnChain === false) {
    complianceIssues.push("Renter role not registered on-chain (admin registration pending)");
  }
  if (ownerAddr && isRentorOnChain === false) {
    complianceIssues.push("Vehicle owner not registered as rentor on-chain");
  }

  const isCompliant = complianceIssues.length === 0;

  // Simplified: 1 USD = 0.0003 ETH (mock rate for demo)
  const ethRate = 0.0003;
  const rentalFeeEth = (totalPriceUsd * ethRate).toFixed(6);
  const securityDepositEth = (totalPriceUsd * 0.2 * ethRate).toFixed(6); // 20% security deposit
  const premiumCoverageEth = premiumCoverage
    ? (totalPriceUsd * 0.15 * ethRate).toFixed(6) // 15% premium coverage fee
    : "0";

  const rentalFeeWei = parseEther(rentalFeeEth);
  const securityDepositWei = parseEther(securityDepositEth);
  // Escrow fee: 0.1% of (rentalFee + securityDeposit) — matches PaymentEscrow contract
  const escrowFeeWei = (rentalFeeWei + securityDepositWei) * BigInt(10) / BigInt(10_000);
  const escrowFeeEth = formatEther(escrowFeeWei);
  const premiumCoverageWei = parseEther(premiumCoverageEth);
  const totalWei = rentalFeeWei + securityDepositWei + escrowFeeWei + premiumCoverageWei;

  const {
    createPayment,
    hash,
    isConfirming,
    isSuccess,
    isPending,
    error,
  } = useCreateRentalBookingPayment();

  // After on-chain success, save txHash to backend
  useEffect(() => {
    if (isSuccess && hash && bookingId) {
      setIsSaving(true);
      bookingApi
        .updateOnChainStatus(bookingId, hash)
        .then(() => {
          toast.success("On-chain payment confirmed!");
          onComplete?.(hash);
        })
        .catch((err: any) => {
          console.error("Save on-chain status error:", err);
          toast.error("Payment confirmed on-chain but failed to update backend");
        })
        .finally(() => setIsSaving(false));
    }
  }, [isSuccess, hash]);

  useEffect(() => {
    if (error) {
      toast.error(error.message?.slice(0, 100) || "On-chain payment failed");
    }
  }, [error]);

  // Derive a unique on-chain bookingId from the MongoDB ObjectId
  // keccak256 hash truncated to uint256 ensures uniqueness without collisions
  const onChainBookingId = bookingId.length > 10
    ? BigInt(keccak256(toHex(bookingId))) % BigInt(2 ** 128)
    : BigInt(parseInt(bookingId));

  const handlePay = () => {
    if (!walletAddress || !vehicle.vehicleNftId || !vehicle.ownerAddress) {
      toast.error("Vehicle must be registered on-chain and wallet connected");
      return;
    }

    const startTime = BigInt(Math.floor(new Date(pickupDate).getTime() / 1000));
    const endTime = BigInt(Math.floor(new Date(returnDate).getTime() / 1000));

    createPayment(
      onChainBookingId,
      BigInt(vehicle.vehicleNftId),
      vehicle.ownerAddress as `0x${string}`,
      rentalFeeWei,
      securityDepositWei,
      startTime,
      endTime,
      totalWei,
    );
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardContent className="p-6 space-y-4">
        <h3 className="font-bold text-lg">Pay with ETH</h3>

        <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Rental Fee</span>
            <span className="font-semibold">{rentalFeeEth} ETH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Security Deposit (20%)</span>
            <span className="font-semibold">{securityDepositEth} ETH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Escrow Fee (0.1%)</span>
            <span className="font-semibold">{escrowFeeEth} ETH</span>
          </div>
          {premiumCoverage && (
            <div className="flex justify-between text-indigo-700">
              <span>Premium Coverage (15%)</span>
              <span className="font-semibold">{premiumCoverageEth} ETH</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatEther(totalWei)} ETH</span>
          </div>
        </div>

        {/* Premium Coverage Option */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={premiumCoverage}
              onChange={(e) => setPremiumCoverage(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Premium Coverage (CDW/LDW)
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                +15% of rental fee. Covers collision damage and loss. Recommended if you
                don&apos;t have personal auto insurance.
              </p>
            </div>
          </label>
        </div>

        {!isCompliant && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800 mb-2">
              On-chain compliance requirements not met
            </p>
            <ul className="text-xs text-red-700 space-y-1">
              {complianceIssues.map((issue, i) => (
                <li key={i}>&#x2022; {issue}</li>
              ))}
            </ul>
            <p className="text-xs text-red-600 mt-2">
              {hasRegistryMismatch
                ? "Admin must fix the registry address in Admin > KYC panel."
                : complianceIssues.some(i => i.includes("license") || i.includes("Insurance"))
                ? "Admin must register your OnchainID claims in Admin > KYC > Register Renter Claims."
                : "Contact support or wait for admin to complete on-chain registration."}
            </p>
          </div>
        )}

        {hash && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-800 font-medium">Transaction submitted</p>
            <a
              href={getEtherscanUrl(SEPOLIA_CHAIN_ID, hash, "tx")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              View on Etherscan: {hash.slice(0, 18)}...
            </a>
          </div>
        )}

        <Button
          onClick={handlePay}
          disabled={isPending || isConfirming || isSaving || !walletAddress || isSuccess || !isCompliant}
          className="w-full"
        >
          {isPending
            ? "Confirm in Wallet..."
            : isConfirming
            ? "Confirming on-chain..."
            : isSaving
            ? "Updating booking..."
            : isSuccess
            ? "Payment Complete"
            : !walletAddress
            ? "Connect Wallet First"
            : `Pay ${formatEther(totalWei)} ETH`}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Funds will be held in the rental escrow smart contract until the rental period ends.
        </p>
      </CardContent>
    </Card>
  );
}
