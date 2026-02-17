"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Heading,
  Paragraph,
  Button,
  Card,
  CardContent,
  Badge,
  Progress,
  Input,
  Separator,
} from "@/components/ui";
import { ReviewList, ReviewStats } from "@/components/shared";
import { ExplorerLink, EthUsdDisplay } from "@/components/web3";
import { Vehicle, Review, FundraisingCampaign, Investment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { rentorApi, reviewApi, vehicleApi, investmentApi } from "@/lib/api";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from "wagmi";
import { useVehicleNFT, useParticipantTypeRegistry, useRegShieldPaymentProtocol } from "@/hooks/useContracts";
import { useInitiateRentorCoInvestment, useRentorCoInvestment, useEscrowFee, usePaymentSettings, useVehiclePayments, usePaymentDetails, useVehicleInvestmentTotal } from "@/hooks/useInvestment";
import { useEthPrice } from "@/hooks/usePriceFeed";
import { useIsUserVerified } from "@/hooks/useIdentity";
import { useVehicleOwner, useVehicleMetadata, useVehicleInfo } from "@/hooks/useVehicleData";
import { useValidateVehicle, useIsVehicleOperational } from "@/hooks/useCompliance";
import { useWatchCampaignReports } from "@/hooks/useCRE";
import { useDeployAssetToken, useDeployRevenueToken } from "@/hooks/useTokenDeployment";
import OperatorFeeCard from "@/components/rentor/OperatorFeeCard";
import { MilestoneDocumentUploadModal } from "@/components/rentor/MilestoneDocumentUploadModal";
import { MilestoneDocument, type MilestoneName } from "@/types";
import { useVehicleMilestoneStatus } from "@/hooks/useInvestment";
import { useTokenCompliance, useUpdateTokenCompliance } from "@/hooks/useVehicleSetup";
import { parseGwei, parseEther, formatEther, decodeEventLog } from "viem";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

export default function RentorVehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [campaign, setCampaign] = useState<FundraisingCampaign | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSavingNftId, setIsSavingNftId] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    targetAmount: 0,
    expectedROI: 0,
    duration: 0,
    minInvestment: 0,
    minFundingRequired: 60,
  });

  // On-chain vehicle registration
  const { address: walletAddress } = useAccount();
  const vehicleNFT = useVehicleNFT();
  const {
    data: mintHash,
    writeContract: writeMintVehicle,
    error: mintError,
    isPending: isMinting,
  } = useWriteContract();
  const {
    isLoading: isMintConfirming,
    isSuccess: mintSuccess,
    data: mintReceipt,
  } = useWaitForTransactionReceipt({ hash: mintHash });

  // Check if connected wallet is an authorized operator on VehicleNFT
  const { data: isOperator } = useReadContract({
    address: vehicleNFT.address,
    abi: vehicleNFT.abi,
    functionName: "operators",
    args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
    query: { enabled: !!walletAddress },
  });
  const { data: vehicleNFTOwner } = useReadContract({
    address: vehicleNFT.address,
    abi: vehicleNFT.abi,
    functionName: "owner",
    query: { enabled: !!vehicleNFT.address },
  });
  const canMintVehicle = isOperator === true ||
    (walletAddress && vehicleNFTOwner && walletAddress.toLowerCase() === (vehicleNFTOwner as string).toLowerCase());

  // Co-investment deposit
  const [coInvestAmount, setCoInvestAmount] = useState("");
  const publicClient = usePublicClient();
  const paymentProtocol = useRegShieldPaymentProtocol();
  const {
    coInvest,
    hash: coInvestHash,
    isConfirming: isCoInvestConfirming,
    isSuccess: coInvestSuccess,
    isPending: isCoInvesting,
    error: coInvestError,
  } = useInitiateRentorCoInvestment();

  // Token deployment
  const [tokenSupplyCap, setTokenSupplyCap] = useState("");
  const [tokenDeployStep, setTokenDeployStep] = useState<"idle" | "asset" | "revenue" | "saving" | "done">("idle");
  const {
    deploy: deployAsset,
    hash: assetHash,
    isConfirming: isAssetConfirming,
    isSuccess: assetSuccess,
    assetTokenAddress,
    isPending: isAssetPending,
    error: assetError,
  } = useDeployAssetToken();
  const {
    deploy: deployRevenue,
    hash: revenueHash,
    isConfirming: isRevenueConfirming,
    isSuccess: revenueSuccess,
    revenueTokenAddress,
    isPending: isRevenuePending,
    error: revenueError,
  } = useDeployRevenueToken();

  // Token compliance check (for existing tokens that may need compliance module update)
  const assetAddr = vehicle?.assetTokenAddress as `0x${string}` | undefined;
  const revenueAddr = vehicle?.revenueTokenAddress as `0x${string}` | undefined;
  const { needsUpdate: assetNeedsComplianceUpdate } = useTokenCompliance(assetAddr);
  const { needsUpdate: revenueNeedsComplianceUpdate } = useTokenCompliance(revenueAddr);
  const needsComplianceUpdate = assetNeedsComplianceUpdate || revenueNeedsComplianceUpdate;
  const {
    updateCompliance,
    hash: complianceHash,
    isConfirming: isComplianceConfirming,
    isSuccess: complianceSuccess,
    isPending: isCompliancePending,
    error: complianceError,
  } = useUpdateTokenCompliance();
  const [complianceStep, setComplianceStep] = useState<"idle" | "asset" | "revenue" | "done">("idle");

  // Milestone document upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [milestoneDocuments, setMilestoneDocuments] = useState<MilestoneDocument[]>([]);

  // Handle compliance update flow
  useEffect(() => {
    if (complianceSuccess && complianceStep === "asset" && revenueAddr && revenueNeedsComplianceUpdate) {
      setComplianceStep("revenue");
      updateCompliance(revenueAddr);
    } else if (complianceSuccess && (complianceStep === "revenue" || (complianceStep === "asset" && !revenueNeedsComplianceUpdate))) {
      setComplianceStep("done");
      toast.success("Compliance modules updated!");
    }
  }, [complianceSuccess, complianceStep]);

  useEffect(() => {
    if (complianceError) {
      toast.error(complianceError.message?.slice(0, 100) || "Failed to update compliance");
      setComplianceStep("idle");
    }
  }, [complianceError]);

  useEffect(() => {
    const loadVehicle = async () => {
      setIsLoading(true);
      try {
        const res = await rentorApi.getVehicleById(vehicleId);
        if (res.success) {
          setVehicle(res.data.vehicle);
          setCampaign(res.data.campaign);
          setInvestments(res.data.investments || []);
        }

        // Load reviews
        try {
          const reviewRes = await reviewApi.getByVehicle(vehicleId);
          if (reviewRes.success) {
            setReviews(reviewRes.data);
          }
        } catch {
          // Reviews may not exist yet
        }
      } catch {
        // Vehicle not found or unauthorized
      }
      setIsLoading(false);
    };

    loadVehicle();
  }, [vehicleId]);

  // Load milestone documents when vehicle has token registration complete
  const loadMilestoneDocuments = async () => {
    if (!vehicleId) return;
    try {
      const res = await vehicleApi.getMilestoneDocuments(vehicleId);
      if (res.success) setMilestoneDocuments(res.data);
    } catch {
      // Not critical
    }
  };

  useEffect(() => {
    if (vehicle?.tokenRegistrationComplete) {
      loadMilestoneDocuments();
    }
  }, [vehicle?.tokenRegistrationComplete, vehicleId]);

  const isVehicleRegistered = !!(vehicle?.vehicleNftId !== undefined && vehicle?.vehicleNftId !== null);

  // Co-investment on-chain read hooks
  const vehicleTokenId = isVehicleRegistered && vehicle?.vehicleNftId != null ? BigInt(vehicle.vehicleNftId) : undefined;
  const { data: milestoneStatusData } = useVehicleMilestoneStatus(vehicleTokenId);
  const milestoneStatus = milestoneStatusData as {
    vehicleIdentified: boolean;
    purchaseVerified: boolean;
    insuranceObtained: boolean;
    registrationCompleted: boolean;
    allFundsReleased: boolean;
    completedAt: bigint;
  } | undefined;
  const onChainMilestones = milestoneStatus
    ? [milestoneStatus.vehicleIdentified, milestoneStatus.purchaseVerified, milestoneStatus.insuranceObtained, milestoneStatus.registrationCompleted]
    : [];
  const completedMilestoneCount = onChainMilestones.filter(Boolean).length;

  const { data: onChainCoInvestment, formatted: onChainCoInvestFormatted } = useRentorCoInvestment(vehicleTokenId);
  const hasDepositedOnChain = onChainCoInvestment ? (onChainCoInvestment as bigint) > BigInt(0) : false;

  const coInvestAmountWei = coInvestAmount ? parseEther(coInvestAmount) : undefined;
  const { data: coInvestEscrowFee } = useEscrowFee(coInvestAmountWei && coInvestAmountWei > BigInt(0) ? coInvestAmountWei : undefined);

  // On-chain campaign totals (source of truth)
  const { price: ethPrice } = useEthPrice();
  const { data: vehiclePaymentIds } = useVehiclePayments(vehicleTokenId);
  const onChainPayments = vehiclePaymentIds as bigint[] | undefined;
  const onChainInvestorCount = onChainPayments?.length ?? 0;

  // Total raised = rentor co-investment + investor payments (from smart contract)
  const { data: vehicleInvestmentTotalWei } = useVehicleInvestmentTotal(vehicleTokenId);
  const coInvestEth = onChainCoInvestment ? parseFloat(formatEther(onChainCoInvestment as bigint)) : 0;
  const totalRaisedEth = vehicleInvestmentTotalWei
    ? parseFloat(formatEther(vehicleInvestmentTotalWei as bigint))
    : coInvestEth; // Fallback to co-invest only if total not available yet
  const totalRaisedUsd = totalRaisedEth * ethPrice;

  // Pre-flight validation for co-investment deposit
  const { data: isIdentityVerified, isLoading: identityLoading } = useIsUserVerified(walletAddress);
  const participantRegistry = useParticipantTypeRegistry();
  const { data: isRentorOnChain, isLoading: rentorRoleLoading, error: rentorRoleError, isError: rentorRoleIsError } = useReadContract({
    address: participantRegistry.address,
    abi: participantRegistry.abi,
    functionName: "isRentor",
    args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
    query: { enabled: !!walletAddress && !!participantRegistry.address },
  });
  const { data: nftOwner, isLoading: nftOwnerLoading } = useVehicleOwner(vehicleTokenId);
  const isNftOwner = nftOwner && walletAddress
    ? (nftOwner as string).toLowerCase() === walletAddress.toLowerCase()
    : undefined;
  const { minPaymentAmount, maxPaymentAmount } = usePaymentSettings();
  const campaignCREEvents = useWatchCampaignReports();
  const coInvestPreflightLoading = walletAddress ? (identityLoading || (rentorRoleLoading && !rentorRoleIsError) || nftOwnerLoading) : false;

  // Log contract read errors for debugging
  if (rentorRoleIsError && rentorRoleError) {
    console.error("isRentor read error:", rentorRoleError);
    console.error("ParticipantTypeRegistry address:", participantRegistry.address);
    console.error("isRentor args:", walletAddress);
  }

  // Build pre-flight validation warnings
  const coInvestWarnings: string[] = [];
  if (walletAddress && isIdentityVerified === false) {
    coInvestWarnings.push("Your identity is not verified on-chain. Ask admin to verify your identity in the IdentityRegistry.");
  }
  if (walletAddress && rentorRoleIsError) {
    coInvestWarnings.push(`Rentor role check failed: ${rentorRoleError?.message?.slice(0, 120) || "contract read error"}. Check console.`);
  } else if (walletAddress && isRentorOnChain === false) {
    coInvestWarnings.push("You are not registered as a rentor in the ParticipantTypeRegistry.");
  }
  if (vehicleTokenId !== undefined && isNftOwner === false) {
    coInvestWarnings.push("Your connected wallet does not own this vehicle NFT. The NFT owner must make the deposit.");
  }
  if (hasDepositedOnChain) {
    coInvestWarnings.push("A co-investment already exists for this vehicle on-chain.");
  }
  if (coInvestAmountWei && minPaymentAmount && coInvestAmountWei <= minPaymentAmount) {
    coInvestWarnings.push(`Amount must be greater than ${formatEther(minPaymentAmount)} ETH (contract minimum).`);
  }
  if (coInvestAmountWei && maxPaymentAmount && coInvestAmountWei >= maxPaymentAmount) {
    coInvestWarnings.push(`Amount must be less than ${formatEther(maxPaymentAmount)} ETH (contract maximum).`);
  }
  if (coInvestAmountWei && coInvestAmountWei > BigInt(0) && !coInvestEscrowFee) {
    coInvestWarnings.push("Escrow fee is still loading. Please wait.");
  }

  // After mint confirmed, parse tokenId from Transfer event and save to backend
  useEffect(() => {
    if (!mintSuccess || !mintReceipt || !vehicle) return;

    const saveTokenId = async () => {
      try {
        const transferLog = mintReceipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: [{ type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] }],
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === "Transfer";
          } catch {
            return false;
          }
        });

        if (!transferLog) {
          toast.error("Could not parse tokenId from transaction");
          return;
        }

        const decoded = decodeEventLog({
          abi: [{ type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] }],
          data: transferLog.data,
          topics: transferLog.topics,
        });

        const tokenId = Number((decoded.args as any).tokenId);

        setIsSavingNftId(true);
        await vehicleApi.setVehicleNftId(vehicle._id, tokenId, walletAddress || "");
        toast.success(`Vehicle registered on-chain! Token ID: ${tokenId}`);
        // Refresh vehicle data
        setVehicle((prev) => prev ? { ...prev, vehicleNftId: tokenId, ownerAddress: walletAddress || "" } : prev);
      } catch (error: any) {
        console.error("Save NFT ID error:", error);
        toast.error(error.response?.data?.message || "Failed to save token ID");
      } finally {
        setIsSavingNftId(false);
      }
    };

    saveTokenId();
  }, [mintSuccess, mintReceipt]);

  useEffect(() => {
    if (mintError) {
      console.error("Mint vehicle error:", mintError);
      const msg = String(mintError.message || "");
      if (msg.includes("Unauthorized") || msg.includes("gas")) {
        toast.error("Only the contract owner or an authorized operator can register vehicles on-chain. Ask the admin to register this vehicle or add your wallet as an operator.");
      } else if (msg.includes("VINAlreadyExists")) {
        toast.error("This vehicle's VIN is already registered on-chain.");
      } else if (msg.includes("User rejected") || msg.includes("user rejected")) {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error(msg.slice(0, 120) || "Failed to mint vehicle NFT");
      }
    }
  }, [mintError]);

  // Co-investment deposit success: record in backend
  useEffect(() => {
    if (!coInvestSuccess || !campaign || !coInvestAmount) return;

    const recordCoInvestment = async () => {
      try {
        // Convert ETH amount to USD for backend storage
        const ethAmount = parseFloat(coInvestAmount);
        const usdAmount = ethPrice > 0 ? ethAmount * ethPrice : ethAmount;
        await investmentApi.recordRentorCoInvestment(campaign._id, {
          amount: usdAmount,
          txHash: coInvestHash || "",
        });
        toast.success("Co-investment deposited on-chain!");
        setCampaign((prev) =>
          prev ? { ...prev, rentorDepositedOnChain: true, rentorDepositTxHash: coInvestHash || "", currentAmount: (prev.currentAmount || 0) + usdAmount } : prev
        );
      } catch (error: any) {
        console.error("Record co-investment error:", error);
        toast.error("On-chain deposit succeeded but failed to update backend");
      }
    };

    recordCoInvestment();
  }, [coInvestSuccess]);

  useEffect(() => {
    if (!coInvestError) return;
    // Walk the cause chain to get the deepest error message
    let fullMsg = "";
    let err: unknown = coInvestError;
    while (err) {
      const errMsg = (err as Error).message || "";
      if (errMsg) fullMsg += " " + errMsg;
      err = (err as { cause?: unknown }).cause;
    }
    fullMsg = fullMsg || String(coInvestError);
    console.error("Co-investment error (full):", fullMsg);
    console.error("Co-investment error (raw):", coInvestError);

    // Decode known contract revert reasons
    const knownReverts: Record<string, string> = {
      IdentityNotVerified: "Identity not verified on-chain. Admin must verify your identity first.",
      ComplianceValidationFailed: "Not registered as a rentor in ParticipantTypeRegistry.",
      NotVehicleOwner: "Your wallet does not own this vehicle NFT.",
      RentorCoInvestmentAlreadyExists: "A co-investment already exists for this vehicle.",
      InsufficientBalance: "Insufficient ETH sent (amount + escrow fee).",
      AmountBelowMinimum: "Amount is below the minimum payment threshold.",
      AmountExceedsMaximum: "Amount exceeds the maximum payment threshold.",
      ReasonRequired: "A reason string is required.",
      EnforcedPause: "The contract is currently paused. Contact admin.",
      InsufficientEscrowAmount: "Insufficient ETH for escrow. Try increasing the amount slightly.",
    };
    for (const [key, description] of Object.entries(knownReverts)) {
      if (fullMsg.includes(key)) {
        toast.error(description);
        return;
      }
    }
    if (fullMsg.includes("gas") && (fullMsg.includes("exceeds") || fullMsg.includes("too high") || fullMsg.includes("reverted"))) {
      toast.error("Transaction would revert on-chain. Check the compliance status below the deposit form.");
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
    toast.error(fullMsg.slice(0, 150) || "Co-investment failed");
  }, [coInvestError]);

  // Token deployment: after AssetToken deployed, auto-deploy RevenueToken
  useEffect(() => {
    if (assetSuccess && assetTokenAddress && tokenDeployStep === "asset" && vehicle) {
      toast.success(`AssetToken deployed: ${assetTokenAddress.slice(0, 10)}...`);
      setTokenDeployStep("revenue");
      const vin = vehicle.vin || `VIN-${vehicle._id.slice(-8).toUpperCase()}`;
      const supplyCap = parseEther(tokenSupplyCap || "1");
      const sixMonths = BigInt(15552000);
      const nftSuffix = vehicle.vehicleNftId != null ? vehicle.vehicleNftId : "";
      deployRevenue(
        `${vehicle.brand} ${vehicle.model} Revenue`,
        `RS${vehicle.brand.slice(0, 2).toUpperCase()}${nftSuffix}R`,
        supplyCap,
        vin,
        sixMonths,
      );
    }
  }, [assetSuccess, assetTokenAddress]);

  // Token deployment: after RevenueToken deployed, save both to backend
  useEffect(() => {
    if (revenueSuccess && revenueTokenAddress && assetTokenAddress && tokenDeployStep === "revenue" && vehicle) {
      toast.success(`RevenueToken deployed: ${revenueTokenAddress.slice(0, 10)}...`);
      setTokenDeployStep("saving");

      const saveTokens = async () => {
        try {
          await vehicleApi.setVehicleTokens(vehicle._id, assetTokenAddress, revenueTokenAddress);
          setVehicle((prev) =>
            prev ? { ...prev, assetTokenAddress, revenueTokenAddress } : prev
          );
          toast.success("Token addresses saved!");
          setTokenDeployStep("done");
        } catch (error: any) {
          console.error("Save tokens error:", error);
          toast.error("Tokens deployed but failed to save to backend");
          setTokenDeployStep("done");
        }
      };
      saveTokens();
    }
  }, [revenueSuccess, revenueTokenAddress]);

  useEffect(() => {
    if (assetError) {
      toast.error(assetError.message?.slice(0, 100) || "AssetToken deployment failed");
      setTokenDeployStep("idle");
    }
  }, [assetError]);

  useEffect(() => {
    if (revenueError) {
      toast.error(revenueError.message?.slice(0, 100) || "RevenueToken deployment failed");
      setTokenDeployStep("idle");
    }
  }, [revenueError]);

  const handleDeployTokens = () => {
    if (!vehicle || !walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }
    const supplyCap = parseFloat(tokenSupplyCap);
    if (!supplyCap || supplyCap <= 0) {
      toast.error("Please enter a valid supply cap");
      return;
    }

    setTokenDeployStep("asset");
    const vin = vehicle.vin || `VIN-${vehicle._id.slice(-8).toUpperCase()}`;
    const supplyCapWei = parseEther(tokenSupplyCap);
    const nftSuffix = vehicle.vehicleNftId != null ? vehicle.vehicleNftId : "";
    deployAsset(
      `${vehicle.brand} ${vehicle.model} Asset`,
      `RS${vehicle.brand.slice(0, 2).toUpperCase()}${nftSuffix}`,
      supplyCapWei,
      vin,
    );
  };

  const handleCoInvestDeposit = async () => {
    if (!campaign || !vehicle || !walletAddress || !vehicle.vehicleNftId) {
      toast.error("Vehicle must be registered on-chain first");
      return;
    }

    const amountEth = parseFloat(coInvestAmount);
    if (!amountEth || amountEth <= 0) {
      toast.error("Please enter a valid ETH amount");
      return;
    }

    const amountWei = parseEther(coInvestAmount);
    const feeWei = (coInvestEscrowFee as bigint) || BigInt(0);
    const totalWei = amountWei + feeWei;
    const vehicleTokenId = BigInt(vehicle.vehicleNftId);
    const reason = `Rentor co-investment for ${vehicle.brand} ${vehicle.model} (Vehicle #${vehicle.vehicleNftId})`;

    // Simulate first to get actual revert reason (instead of opaque gas error)
    if (publicClient && paymentProtocol.address) {
      try {
        await publicClient.simulateContract({
          address: paymentProtocol.address,
          abi: paymentProtocol.abi,
          functionName: "initiateRentorCoInvestment",
          args: [vehicleTokenId, amountWei, reason],
          value: totalWei,
          account: walletAddress as `0x${string}`,
        });
      } catch (simError: any) {
        // Extract the actual revert reason from simulation
        let simMsg = "";
        let err: unknown = simError;
        while (err) {
          const errMsg = (err as Error).message || "";
          if (errMsg) simMsg += " " + errMsg;
          err = (err as { cause?: unknown }).cause;
        }
        simMsg = simMsg || String(simError);
        console.error("Co-investment simulation failed:", simMsg);

        // Also log raw error data for debugging
        const rawData = simError?.data || simError?.cause?.data || simError?.cause?.cause?.data;
        if (rawData) console.error("Raw revert data:", rawData);

        const knownReverts: Record<string, string> = {
          IdentityNotVerified: "Your identity is not verified on-chain. Admin must register your new wallet in the IdentityRegistry.",
          ComplianceValidationFailed: "Not registered as a rentor on-chain. Admin must register you in the ParticipantTypeRegistry.",
          NotVehicleOwner: "Your wallet does not own this vehicle NFT on-chain.",
          RentorCoInvestmentAlreadyExists: "A co-investment already exists for this vehicle.",
          InsufficientBalance: "Insufficient ETH sent. The contract requires amount + escrow fee.",
          AmountBelowMinimum: "Amount is below the minimum payment threshold.",
          AmountExceedsMaximum: "Amount exceeds the maximum payment threshold.",
          ReasonRequired: "A reason string is required.",
          EnforcedPause: "The payment contract is currently paused.",
          InsufficientEscrowAmount: "Insufficient ETH for escrow creation.",
          EscrowAlreadyExistsForPayment: "An escrow already exists for this payment.",
        };

        for (const [key, description] of Object.entries(knownReverts)) {
          if (simMsg.includes(key)) {
            toast.error(description);
            return;
          }
        }

        // If we can't decode the error, run targeted diagnostic checks
        const diagnostics: string[] = [];
        try {
          if (isIdentityVerified === false) diagnostics.push("Identity NOT verified on-chain");
          else if (isIdentityVerified === undefined) diagnostics.push("Identity check still loading");

          if (isRentorOnChain === false) diagnostics.push("NOT registered as rentor on-chain");
          else if (isRentorOnChain === undefined) diagnostics.push("Rentor role check still loading");

          if (isNftOwner === false) diagnostics.push("Wallet does NOT own this vehicle NFT");
          else if (isNftOwner === undefined) diagnostics.push("NFT ownership check still loading");

          if (hasDepositedOnChain) diagnostics.push("Co-investment already exists for this vehicle");

          if (feeWei === BigInt(0)) diagnostics.push("Escrow fee is 0 — may cause InsufficientBalance");
        } catch { /* ignore diagnostic errors */ }

        if (diagnostics.length > 0) {
          const diagMsg = "Transaction reverted. Likely cause:\n" + diagnostics.map(d => "• " + d).join("\n");
          console.error(diagMsg);
          toast.error(diagnostics[0]); // Show the first issue
        } else {
          toast.error("Transaction would revert on-chain. All pre-flight checks passed — the issue may be in escrow setup or contract configuration. Check console.");
        }
        return;
      }
    }

    coInvest(vehicleTokenId, amountWei, reason, totalWei);
  };

  const handleRegisterOnChain = () => {
    if (!vehicle || !walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    const vin = vehicle.vin || `VIN-${vehicle._id.slice(-8).toUpperCase()}`;
    const oneYearFromNow = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

    writeMintVehicle({
      address: vehicleNFT.address,
      abi: vehicleNFT.abi,
      functionName: "mintVehicle",
      args: [
        walletAddress,
        {
          vin,
          make: vehicle.brand,
          model: vehicle.model,
          year: BigInt(vehicle.year),
          color: vehicle.color || "Unknown",
          mileage: BigInt(vehicle.mileage || 0),
          registrationExpiry: oneYearFromNow,
          insuranceExpiry: oneYearFromNow,
        },
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000001",
      ],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const handleEditCampaign = () => {
    if (!campaign) return;
    setEditForm({
      targetAmount: campaign.targetAmount,
      expectedROI: campaign.expectedROI,
      duration: campaign.duration,
      minInvestment: campaign.minInvestment,
      minFundingRequired: campaign.minFundingRequired ?? 60,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!campaign) return;
    setIsActionLoading(true);
    try {
      const res = await investmentApi.updateCampaign(campaign._id, editForm);
      if (res.success) {
        toast.success("Campaign updated successfully");
        setCampaign(res.data);
        setShowEditModal(false);
      } else {
        toast.error(res.message || "Failed to update campaign");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update campaign");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseCampaign = async () => {
    if (!campaign) return;
    setIsActionLoading(true);
    try {
      const res = await investmentApi.pauseCampaign(campaign._id);
      if (res.success) {
        toast.success(res.message);
        setCampaign(res.data);
      } else {
        toast.error(res.message || "Failed to pause campaign");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to pause campaign");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEndCampaign = async () => {
    if (!campaign) return;
    setIsActionLoading(true);
    try {
      const res = await investmentApi.cancelCampaign(campaign._id);
      if (res.success) {
        toast.success(res.message || "Campaign ended and investors refunded");
        setCampaign((prev) => prev ? { ...prev, status: "cancelled" as any, currentAmount: 0 } : prev);
        // Clear token addresses so "Deploy Tokens" section reappears for a new campaign
        setVehicle((prev) => prev ? { ...prev, assetTokenAddress: undefined as any, revenueTokenAddress: undefined as any } : prev);
        setTokenDeployStep("idle");
        setShowEndConfirm(false);
      } else {
        toast.error(res.message || "Failed to end campaign");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to end campaign");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-96 bg-gray-200 rounded-lg" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Heading as="h2" className="mb-4">
            Vehicle Not Found
          </Heading>
          <Paragraph className="mb-6">
            This vehicle doesn't exist or has been removed.
          </Paragraph>
          <Button onClick={() => router.push("/rentor/vehicles")}>
            Back to My Vehicles
          </Button>
        </Card>
      </div>
    );
  }

  const { fundraising } = vehicle;
  const hasCampaign = campaign && ["active", "funded", "draft", "paused"].includes(campaign.status);
  const isPaused = campaign?.status === "paused";
  const canEditCampaign = campaign && ["active", "paused", "draft"].includes(campaign.status);
  const canEndCampaign = campaign && campaign.status !== "funded" && campaign.status !== "cancelled";
  // Use on-chain USD total for progress, fallback to campaign.currentAmount
  const effectiveRaised = totalRaisedUsd > 0 ? totalRaisedUsd : (campaign?.currentAmount ?? 0);
  const fundingPercentage = hasCampaign && campaign
    ? Math.min((effectiveRaised / campaign.targetAmount) * 100, 100)
    : 0;
  const remainingAmount = hasCampaign && campaign
    ? Math.max(campaign.targetAmount - effectiveRaised, 0)
    : 0;
  const daysLeft = hasCampaign && campaign?.endDate
    ? Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Revenue waterfall percentages from RevenueDistributor.sol
  const WATERFALL = {
    platformFee: 0.15,
    maintenance: 0.10,
    insurance: 0.05,
    operatingCosts: 0.10,
    operatorFee: 0.10,
    netToInvestors: 0.50,
  };

  // Financial projections (assume 70% occupancy)
  const grossAnnual = vehicle.pricePerDay * 365 * 0.7;
  const waterfall = {
    grossAnnual,
    platformFee: grossAnnual * WATERFALL.platformFee,
    maintenance: grossAnnual * WATERFALL.maintenance,
    insurance: grossAnnual * WATERFALL.insurance,
    operatingCosts: grossAnnual * WATERFALL.operatingCosts,
    operatorFee: grossAnnual * WATERFALL.operatorFee,
    netToInvestors: grossAnnual * WATERFALL.netToInvestors,
  };

  // Investment pitch
  const targetAmount = campaign?.targetAmount || fundraising?.targetAmount || 0;
  const investmentPitch = {
    overview: `Invest in this ${vehicle.year} ${vehicle.brand} ${vehicle.model}, a premium ${vehicle.category} available for rental in ${vehicle.location}. This vehicle represents a unique opportunity to earn passive income through the sharing economy.`,
    whyInvest: [
      `High-demand ${vehicle.category} in ${vehicle.location}'s competitive rental market`,
      `Premium ${vehicle.brand} brand with strong resale value`,
      `Competitive daily rate of ${formatCurrency(vehicle.pricePerDay)}`,
      `Professional maintenance and insurance coverage included`,
      `Transparent blockchain-based revenue distribution`,
    ],
    useOfFunds: targetAmount > 0 ? [
      { item: "Vehicle Acquisition", percentage: 70, amount: targetAmount * 0.7 },
      { item: "Insurance & Registration", percentage: 10, amount: targetAmount * 0.1 },
      { item: "Initial Maintenance", percentage: 10, amount: targetAmount * 0.1 },
      { item: "Platform Fees", percentage: 5, amount: targetAmount * 0.05 },
      { item: "Reserve Fund", percentage: 5, amount: targetAmount * 0.05 },
    ] : [],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/rentor/vehicles")}
        className="mb-6"
      >
        ← Back to My Vehicles
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Image & Title */}
          <Card className="overflow-hidden">
            <div className="relative h-96">
              <Image
                src={vehicle.image || "/assets/car_image1.png"}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-full h-full object-cover"
                width={800}
                height={400}
              />
              <div className="absolute top-4 left-4 flex gap-2">
                {hasCampaign && campaign && (
                  <>
                    <Badge variant="default" className="shadow-lg">
                      {fundingPercentage.toFixed(0)}% Funded
                    </Badge>
                    <Badge variant="success" className="shadow-lg">
                      {campaign.expectedROI}% ROI
                    </Badge>
                  </>
                )}
                <Badge
                  variant={vehicle.isAvailable ? "success" : "default"}
                  className="shadow-lg"
                >
                  {vehicle.isAvailable ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Heading as="h1" className="mb-2">
                    {vehicle.brand} {vehicle.model} ({vehicle.year})
                  </Heading>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>📍 {vehicle.location}</span>
                    <span>🚗 {vehicle.category}</span>
                    <span>⛽ {vehicle.fuel_type}</span>
                    <span>👥 {vehicle.seating_capacity} seats</span>
                    <span>⚙️ {vehicle.transmission}</span>
                  </div>
                </div>
                <Button variant="outline" onClick={handleEditCampaign}>
                  Edit Vehicle
                </Button>
              </div>
              <Paragraph className="text-lg">{vehicle.description}</Paragraph>
            </CardContent>
          </Card>

          {/* Campaign Performance */}
          {hasCampaign && campaign && (
            <Card>
              <CardContent className="p-6">
                <Heading as="h2" className="mb-4">
                  Campaign Performance
                </Heading>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Raised</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(effectiveRaised)}
                    </p>
                    {totalRaisedEth > 0 && (
                      <p className="text-sm text-blue-500 mt-0.5">
                        {totalRaisedEth.toFixed(4)} ETH
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      of {formatCurrency(campaign.targetAmount)} goal
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Investors</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.max(investments.length, onChainInvestorCount)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Active token holders
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Expected ROI</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {campaign.expectedROI}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Annual return</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Days Remaining</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {daysLeft}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Until campaign end</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold">Funding Progress</span>
                    <span>{fundingPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={fundingPercentage} variant="default" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investment Pitch */}
          {hasCampaign && (
            <Card>
              <CardContent className="p-6">
                <Heading as="h2" className="mb-4">
                  Investment Opportunity
                </Heading>
                <Paragraph className="mb-6">{investmentPitch.overview}</Paragraph>

                <Heading as="h3" className="mb-3">
                  Why Invest?
                </Heading>
                <ul className="space-y-2 mb-6">
                  {investmentPitch.whyInvest.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Investor List */}
          {hasCampaign && investments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <Heading as="h2" className="mb-4">
                  Investors ({investments.length})
                </Heading>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Investor
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {investments.map((investment) => {
                        // investor is populated as { _id, name, walletAddress } from backend
                        const investor = investment.investor as unknown as { _id: string; name: string; walletAddress?: string } | string;
                        const isPopulated = typeof investor === "object" && investor !== null;
                        return (
                          <tr key={investment._id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium">
                                  {isPopulated ? investor.name : "Investor"}
                                </p>
                                {isPopulated && investor.walletAddress && (
                                  <ExplorerLink value={investor.walletAddress} type="address" className="text-xs" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              {formatCurrency(investment.amount)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(investment.investedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenue Projection */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Revenue Projection
              </Heading>
              <p className="text-sm text-gray-500 mb-4">
                Estimated annual breakdown at 70% occupancy ({formatCurrency(vehicle.pricePerDay)}/day)
              </p>

              {/* Gross Revenue */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">Gross Annual Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(waterfall.grossAnnual)}</p>
                </div>
              </div>

              {/* Waterfall Breakdown */}
              <div className="space-y-3 mb-6">
                {[
                  { label: "Platform Fee", pct: WATERFALL.platformFee, amount: waterfall.platformFee, color: "bg-gray-200" },
                  { label: "Maintenance Reserve", pct: WATERFALL.maintenance, amount: waterfall.maintenance, color: "bg-orange-200" },
                  { label: "Insurance", pct: WATERFALL.insurance, amount: waterfall.insurance, color: "bg-yellow-200" },
                  { label: "Operating Costs", pct: WATERFALL.operatingCosts, amount: waterfall.operatingCosts, color: "bg-red-200" },
                  { label: "Operator Fee (Rentor)", pct: WATERFALL.operatorFee, amount: waterfall.operatorFee, color: "bg-indigo-200" },
                  { label: "Distributed to Investors", pct: WATERFALL.netToInvestors, amount: waterfall.netToInvestors, color: "bg-green-200" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.label}</span>
                      <span className="font-semibold">
                        {(item.pct * 100).toFixed(0)}% &middot; {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${item.color} rounded-full h-2`} style={{ width: `${item.pct * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-indigo-700">{formatCurrency(waterfall.operatorFee)}</p>
                  <p className="text-xs text-indigo-600">Operator Fee/yr</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{formatCurrency(waterfall.netToInvestors)}</p>
                  <p className="text-xs text-green-600">Investor Dist./yr</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-purple-700">{formatCurrency(vehicle.pricePerDay)}</p>
                  <p className="text-xs text-purple-600">Daily Rental Rate</p>
                </div>
              </div>

              {/* Use of Funds */}
              {hasCampaign && investmentPitch.useOfFunds.length > 0 && (
                <div className="mt-6">
                  <Heading as="h3" className="mb-3">
                    Use of Funds
                  </Heading>
                  <div className="space-y-3">
                    {investmentPitch.useOfFunds.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{item.item}</span>
                          <span className="font-semibold">
                            {item.percentage}% &middot; {formatCurrency(item.amount)}
                          </span>
                        </div>
                        <Progress value={item.percentage} variant="default" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Management Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Campaign Management
              </Heading>

              {hasCampaign && campaign ? (
                <>
                  {/* Campaign Stats */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <Badge variant={isPaused ? "warning" : "success"}>{campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}</Badge>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-gray-600">Raised</span>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(effectiveRaised)}</span>
                        {totalRaisedEth > 0 && (
                          <span className="text-xs text-gray-500 ml-1">({totalRaisedEth.toFixed(4)} ETH)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining</span>
                      <span className="font-semibold">
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold">
                        {fundingPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Funding</span>
                      <span className="font-semibold">
                        {campaign.minFundingRequired ?? 60}%
                      </span>
                    </div>
                  </div>

                  {/* Management Actions */}
                  <div className="space-y-3">
                    {canEditCampaign && (
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={handleEditCampaign}
                        disabled={isActionLoading}
                      >
                        Edit Campaign
                      </Button>
                    )}
                    {(campaign.status === "active" || campaign.status === "paused") && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handlePauseCampaign}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? "Processing..." : isPaused ? "Resume Campaign" : "Pause Campaign"}
                      </Button>
                    )}
                    {canEndCampaign && !showEndConfirm && (
                      <Button
                        variant="outline"
                        className="w-full text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => setShowEndConfirm(true)}
                        disabled={isActionLoading}
                      >
                        End Campaign
                      </Button>
                    )}

                    {/* End Campaign Confirmation */}
                    {showEndConfirm && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                        <p className="text-sm font-semibold text-red-800">Are you sure?</p>
                        <p className="text-xs text-red-600">
                          This will permanently end the campaign.
                          {campaign.currentAmount > 0 && (
                            <span className="block mt-1 font-medium">
                              All {formatCurrency(campaign.currentAmount)} in investments will be refunded to investors.
                            </span>
                          )}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleEndCampaign}
                            disabled={isActionLoading}
                            className="flex-1 bg-red-600! hover:bg-red-700! text-white!"
                          >
                            {isActionLoading ? "Ending..." : campaign.currentAmount > 0 ? "End & Refund" : "End Campaign"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setShowEndConfirm(false)}
                            disabled={isActionLoading}
                            className="flex-1"
                          >
                            Keep
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className={`mt-6 ${isPaused ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"} border rounded-lg p-4`}>
                    <p className={`text-xs ${isPaused ? "text-yellow-800" : "text-green-800"}`}>
                      {isPaused ? (
                        <><strong>Campaign Paused:</strong> New investments are temporarily disabled. Resume the campaign to accept investments again.</>
                      ) : (
                        <><strong>Campaign Active:</strong> Investors can currently purchase tokens for this vehicle. Revenue will be distributed automatically.</>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Paragraph className="mb-6 text-gray-600">
                    This vehicle doesn't have an active fundraising campaign.
                  </Paragraph>
                  <Button
                    className="w-full"
                    onClick={() => router.push("/rentor/fundraising")}
                  >
                    Create Campaign
                  </Button>
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-800">
                      Create a fundraising campaign to raise capital for this
                      vehicle through tokenized investment.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* CRE Campaign Status */}
          {hasCampaign && vehicle.vehicleNftId && (() => {
            const vehicleEvents = campaignCREEvents.filter(
              (e) => e.vehicleId.toString() === vehicle.vehicleNftId?.toString(),
            );
            if (vehicleEvents.length === 0) return null;
            const latestEvent = vehicleEvents[0];
            const isFailed = latestEvent.action === "CAMPAIGN_FAILED";
            return (
              <Card className={`mt-4 border ${isFailed ? "border-red-300 bg-red-50" : "border-orange-300 bg-orange-50"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className={`w-5 h-5 ${isFailed ? "text-red-600" : "text-orange-600"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span className={`text-sm font-semibold ${isFailed ? "text-red-800" : "text-orange-800"}`}>
                      CRE: {isFailed ? "Campaign Failed" : "Campaign Cancelled"}
                    </span>
                  </div>
                  <p className={`text-xs ${isFailed ? "text-red-700" : "text-orange-700"} mb-2`}>
                    Chainlink CRE has detected this campaign as {isFailed ? "failed (underfunded by deadline)" : "cancelled"} and
                    processed batch refunds for {Number(latestEvent.refundedCount)} investor{Number(latestEvent.refundedCount) !== 1 ? "s" : ""}.
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={isFailed ? "text-red-500" : "text-orange-500"}>
                      {new Date(Number(latestEvent.timestamp) * 1000).toLocaleString()}
                    </span>
                    <ExplorerLink value={latestEvent.transactionHash} type="tx" className="text-xs" />
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Co-Investment Deposit */}
          {hasCampaign && campaign && campaign.fundraisingType === "co_invest" && campaign.rentorInvestment > 0 && isVehicleRegistered && (
            <Card className="mt-4">
              <CardContent className="p-6">
                <Heading as="h3" className="mb-4">
                  Co-Investment Deposit
                </Heading>

                {hasDepositedOnChain || campaign.rentorDepositedOnChain ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-sm text-green-700 font-medium">
                        Deposited on-chain
                      </span>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Amount</span>
                        <div className="text-right">
                          {hasDepositedOnChain ? (
                            <>
                              <span className="font-semibold">{onChainCoInvestFormatted} ETH</span>
                              {typeof onChainCoInvestment === "bigint" && (
                                <div className="text-xs text-gray-500">
                                  <EthUsdDisplay amountWei={onChainCoInvestment} primary="USD" showBoth={false} />
                                </div>
                              )}
                            </>
                          ) : (
                            (() => {
                              // Fallback: show from DB when on-chain read isn't available
                              const rentorInv = investments.find((inv: any) =>
                                inv.investor?.walletAddress && vehicle?.ownerAddress &&
                                inv.investor.walletAddress.toLowerCase() === vehicle.ownerAddress.toLowerCase()
                              );
                              const ethAmount = rentorInv?.amountEth;
                              return ethAmount && ethAmount > 0 ? (
                                <>
                                  <span className="font-semibold">{ethAmount.toFixed(4)} ETH</span>
                                  <div className="text-xs text-gray-500">
                                    <EthUsdDisplay amountEth={ethAmount} primary="USD" showBoth={false} />
                                  </div>
                                </>
                              ) : (
                                <span className="font-semibold">{formatCurrency(campaign.rentorInvestment)}</span>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Deposit your co-investment on-chain to receive asset and revenue tokens proportional to your share.
                    </p>

                    <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                      Planned co-investment: {formatCurrency(campaign.rentorInvestment)}
                    </div>

                    <Input
                      type="number"
                      label="Deposit Amount (ETH)"
                      placeholder="0.0"
                      value={coInvestAmount}
                      onChange={(e) => setCoInvestAmount(e.target.value)}
                      min={0}
                      step="0.001"
                    />

                    {coInvestAmount && parseFloat(coInvestAmount) > 0 && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Investment</span>
                          <div className="text-right">
                            <span className="font-semibold">{coInvestAmount} ETH</span>
                            <div className="text-xs text-gray-500">
                              <EthUsdDisplay amountEth={parseFloat(coInvestAmount)} primary="USD" showBoth={false} />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Escrow Fee (0.1%)</span>
                          <div className="text-right">
                            <span className="font-semibold">
                              {coInvestEscrowFee ? formatEther(coInvestEscrowFee as bigint) : "..."} ETH
                            </span>
                            {typeof coInvestEscrowFee === "bigint" && (
                              <div className="text-xs text-gray-500">
                                <EthUsdDisplay amountWei={coInvestEscrowFee} primary="USD" showBoth={false} />
                              </div>
                            )}
                          </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Total</span>
                          <div className="text-right">
                            <span className="font-bold">
                              {coInvestAmountWei && coInvestEscrowFee
                                ? formatEther(coInvestAmountWei + (coInvestEscrowFee as bigint))
                                : "..."} ETH
                            </span>
                            {coInvestAmountWei && typeof coInvestEscrowFee === "bigint" && (
                              <div className="text-xs text-gray-500 font-medium">
                                <EthUsdDisplay amountWei={coInvestAmountWei + coInvestEscrowFee} primary="USD" showBoth={false} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* On-chain Compliance Status */}
                    {walletAddress && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 mb-2">On-chain Compliance Status:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span>{isIdentityVerified === true ? "\u2705" : isIdentityVerified === false ? "\u274C" : "\u23F3"}</span>
                            <span className="text-gray-700">Identity Verified</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{isRentorOnChain === true ? "\u2705" : isRentorOnChain === false ? "\u274C" : rentorRoleIsError ? "\u26A0\uFE0F" : "\u23F3"}</span>
                            <span className="text-gray-700">Rentor Role{rentorRoleIsError ? " (error)" : ""}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{isNftOwner === true ? "\u2705" : isNftOwner === false ? "\u274C" : "\u23F3"}</span>
                            <span className="text-gray-700">NFT Owner</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{hasDepositedOnChain ? "\u274C" : "\u2705"}</span>
                            <span className="text-gray-700">No Existing Deposit</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {coInvestWarnings.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-semibold text-red-800 mb-1">Compliance Issues:</p>
                        {coInvestWarnings.map((w, i) => (
                          <p key={i} className="text-xs text-red-700 flex items-start gap-1">
                            <span className="text-red-500 mt-0.5">&#9888;</span>
                            {w}
                          </p>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={handleCoInvestDeposit}
                      disabled={isCoInvesting || isCoInvestConfirming || !walletAddress || !coInvestAmount || coInvestWarnings.length > 0 || coInvestPreflightLoading}
                      className="w-full"
                    >
                      {isCoInvesting
                        ? "Confirm in Wallet..."
                        : isCoInvestConfirming
                        ? "Confirming Transaction..."
                        : coInvestPreflightLoading
                        ? "Checking compliance..."
                        : !walletAddress
                        ? "Connect Wallet First"
                        : coInvestWarnings.length > 0
                        ? "Compliance Check Failed"
                        : "Deposit Co-Investment"}
                    </Button>

                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                      <p className="text-xs text-indigo-800">
                        Your co-investment will be held in escrow. After milestones complete, you'll receive asset and revenue tokens proportional to your investment.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Deploy Tokens */}
          {isVehicleRegistered && !vehicle.assetTokenAddress && !vehicle.revenueTokenAddress && (
            <Card className="mt-4">
              <CardContent className="p-6">
                <Heading as="h3" className="mb-4">
                  Deploy Investment Tokens
                </Heading>

                {tokenDeployStep === "done" && vehicle.assetTokenAddress ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-sm text-green-700 font-medium">Tokens Deployed</span>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">AssetToken</span>
                        {vehicle.assetTokenAddress && (
                          <ExplorerLink value={vehicle.assetTokenAddress} type="address" className="text-xs" />
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">RevenueToken</span>
                        {vehicle.revenueTokenAddress && (
                          <ExplorerLink value={vehicle.revenueTokenAddress} type="address" className="text-xs" />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Deploy ERC-3643 AssetToken and RevenueToken for this vehicle. These tokens represent ownership shares and revenue entitlement.
                    </p>

                    <Input
                      type="number"
                      label="Supply Cap (ETH equivalent)"
                      placeholder={campaign?.targetAmount ? String(campaign.targetAmount) : "1.0"}
                      value={tokenSupplyCap}
                      onChange={(e) => setTokenSupplyCap(e.target.value)}
                      min={0}
                      step="0.01"
                    />

                    {tokenDeployStep !== "idle" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${tokenDeployStep === "asset" ? "bg-yellow-500 animate-pulse" : assetTokenAddress ? "bg-green-500" : "bg-gray-300"}`} />
                          <span>Deploy AssetToken {assetTokenAddress ? `(${assetTokenAddress.slice(0, 8)}...)` : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${tokenDeployStep === "revenue" ? "bg-yellow-500 animate-pulse" : revenueTokenAddress ? "bg-green-500" : "bg-gray-300"}`} />
                          <span>Deploy RevenueToken {revenueTokenAddress ? `(${revenueTokenAddress.slice(0, 8)}...)` : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${tokenDeployStep === "saving" ? "bg-yellow-500 animate-pulse" : tokenDeployStep === "done" ? "bg-green-500" : "bg-gray-300"}`} />
                          <span>Save to backend</span>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleDeployTokens}
                      disabled={tokenDeployStep !== "idle" || !walletAddress || !tokenSupplyCap}
                      className="w-full"
                    >
                      {isAssetPending
                        ? "Confirm AssetToken in Wallet..."
                        : isAssetConfirming
                        ? "Deploying AssetToken..."
                        : isRevenuePending
                        ? "Confirm RevenueToken in Wallet..."
                        : isRevenueConfirming
                        ? "Deploying RevenueToken..."
                        : tokenDeployStep === "saving"
                        ? "Saving..."
                        : !walletAddress
                        ? "Connect Wallet First"
                        : "Deploy AssetToken + RevenueToken"}
                    </Button>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-xs text-purple-800">
                        This deploys two ERC-3643 tokens via the on-chain factories. The PaymentProtocol is automatically added as an agent so it can mint tokens when investors fund milestones.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Token Addresses (when already deployed) */}
          {vehicle.assetTokenAddress && vehicle.revenueTokenAddress && tokenDeployStep !== "done" && (
            <Card className="mt-4">
              <CardContent className="p-6">
                <Heading as="h3" className="mb-4">
                  Investment Tokens
                </Heading>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-sm text-green-700 font-medium">Tokens Deployed</span>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">AssetToken</span>
                      <ExplorerLink value={vehicle.assetTokenAddress} type="address" className="text-xs" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">RevenueToken</span>
                      <ExplorerLink value={vehicle.revenueTokenAddress} type="address" className="text-xs" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps: Upload Milestone Documents */}
          {vehicle.tokenRegistrationComplete && (
            <Card className="mt-4 border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <Heading as="h3" className="mb-1">Upload Milestone Documents</Heading>
                    <p className="text-sm text-gray-600">
                      Upload proof documents for each milestone (purchase receipt, insurance certificate,
                      registration papers). The admin will review these before approving milestones and releasing funds.
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <Badge variant={milestoneDocuments.length >= 4 ? "success" : "warning"}>
                        {milestoneDocuments.length}/4 documents uploaded
                      </Badge>
                      <Button size="sm" onClick={() => setShowUploadModal(true)}>
                        {milestoneDocuments.length > 0 ? "Manage Documents" : "Upload Documents"}
                      </Button>
                    </div>

                    {/* On-chain Milestone Verification Status */}
                    {onChainMilestones.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-blue-200">
                        <p className="text-xs font-medium text-blue-800 mb-2">
                          On-Chain Verification ({completedMilestoneCount}/4)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Vehicle Identified", done: onChainMilestones[0] },
                            { label: "Purchase Verified", done: onChainMilestones[1] },
                            { label: "Insurance Obtained", done: onChainMilestones[2] },
                            { label: "Registration Completed", done: onChainMilestones[3] },
                          ].map((m) => (
                            <div key={m.label} className="flex items-center gap-1.5">
                              {m.done ? (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white">
                                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-300" />
                              )}
                              <span className={`text-xs ${m.done ? "text-green-700 font-medium" : "text-gray-500"}`}>
                                {m.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        {milestoneStatus?.allFundsReleased && (
                          <Badge variant="success" className="mt-2">
                            All Funds Released & Tokens Minted
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance Module Update (for existing tokens with outdated compliance) */}
          {isVehicleRegistered && vehicle.assetTokenAddress && vehicle.revenueTokenAddress && needsComplianceUpdate && complianceStep !== "done" && (
            <Card className="mt-4 border-orange-200 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <Heading as="h3" className="mb-1">Compliance Module Update Required</Heading>
                    <p className="text-sm text-gray-600 mb-3">
                      Your tokens need a compliance module update to enable milestone completion and fund releases.
                      This is a one-time on-chain update.
                    </p>
                    <Button
                      onClick={() => {
                        if (assetNeedsComplianceUpdate && assetAddr) {
                          setComplianceStep("asset");
                          updateCompliance(assetAddr);
                        } else if (revenueNeedsComplianceUpdate && revenueAddr) {
                          setComplianceStep("revenue");
                          updateCompliance(revenueAddr);
                        }
                      }}
                      disabled={isCompliancePending || isComplianceConfirming}
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      {isCompliancePending
                        ? "Confirm in Wallet..."
                        : isComplianceConfirming
                        ? `Updating ${complianceStep === "asset" ? "Asset" : "Revenue"} Token...`
                        : "Update Compliance Module"}
                    </Button>
                    {complianceHash && (
                      <p className="text-xs text-gray-500 mt-2">
                        Tx: <ExplorerLink value={complianceHash} type="tx" className="text-xs" />
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Token Registration Status */}
          {isVehicleRegistered && vehicle.assetTokenAddress && vehicle.revenueTokenAddress && (
            <Card className="mt-4">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  {vehicle.tokenRegistrationComplete ? (
                    <>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <div>
                        <Heading as="h3" className="mb-1">Token Registration Complete</Heading>
                        <p className="text-sm text-gray-600">
                          Your tokens have been registered on-chain. Investors can now participate in your vehicle&apos;s fundraising campaign.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <div>
                        <Heading as="h3" className="mb-1">Pending Admin Registration</Heading>
                        <p className="text-sm text-gray-600">
                          Your tokens have been deployed successfully. The platform admin will register them on-chain
                          so investors can participate. You&apos;ll receive a notification when this is complete.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <div>
                            <span className="text-gray-400">Asset Token: </span>
                            <span className="font-mono">{vehicle.assetTokenAddress.slice(0, 10)}...</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Revenue Token: </span>
                            <span className="font-mono">{vehicle.revenueTokenAddress.slice(0, 10)}...</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Operator Fees (when tokens deployed) */}
          {isVehicleRegistered && vehicle.assetTokenAddress && vehicle.revenueTokenAddress && (
            <OperatorFeeCard
              vehicleId={BigInt(vehicle.vehicleNftId!)}
              vehicleName={`${vehicle.brand} ${vehicle.model}`}
            />
          )}

          {/* Vehicle Health (CRE Telematics) */}
          {isVehicleRegistered && vehicle.vehicleNftId && (
            <VehicleHealthCard vehicleNftId={BigInt(vehicle.vehicleNftId)} />
          )}

          {/* Vehicle Compliance Status (OperationalCompliance) */}
          {isVehicleRegistered && vehicle.vehicleNftId && (
            <VehicleComplianceCard vehicleNftId={BigInt(vehicle.vehicleNftId)} />
          )}

          {/* Blockchain Registration */}
          <Card className="mt-4">
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Blockchain Registration
              </Heading>
              {isVehicleRegistered ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-sm text-green-700 font-medium">
                    Registered on-chain (Token ID: {vehicle.vehicleNftId})
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Register this vehicle as an NFT on-chain to enable investor participation.
                  </p>
                  {walletAddress && !canMintVehicle && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      Your wallet is not yet authorized as a vehicle operator. The admin will authorize your wallet when approving your KYC. If your KYC is already approved, ask the admin to authorize your wallet in the KYC management panel.
                    </p>
                  )}
                  <Button
                    onClick={handleRegisterOnChain}
                    disabled={isMinting || isMintConfirming || isSavingNftId || !walletAddress || !canMintVehicle}
                    className="w-full"
                  >
                    {isMinting
                      ? "Confirm in Wallet..."
                      : isMintConfirming
                      ? "Confirming Transaction..."
                      : isSavingNftId
                      ? "Saving Token ID..."
                      : !walletAddress
                      ? "Connect Wallet First"
                      : !canMintVehicle
                      ? "Not Authorized (Admin Only)"
                      : "Register Vehicle On-Chain"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <div className="mt-8">
          <Heading as="h2" className="mb-6">
            Customer Reviews
          </Heading>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ReviewList reviews={reviews} />
            </div>
            <div className="lg:col-span-1">
              <ReviewStats reviews={reviews} />
            </div>
          </div>
        </div>
      )}

      {/* Milestone Document Upload Modal */}
      {showUploadModal && vehicle && (
        <MilestoneDocumentUploadModal
          vehicleId={vehicle._id}
          existingDocuments={milestoneDocuments}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => loadMilestoneDocuments()}
        />
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && campaign && (
        <div
          onClick={() => !isActionLoading && setShowEditModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <Heading as="h2">Edit Campaign</Heading>
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={isActionLoading}
                  className="text-gray-500 hover:text-gray-800"
                  aria-label="Close"
                >
                  &#10005;
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  type="number"
                  label="Target Amount ($)"
                  value={editForm.targetAmount}
                  onChange={(e) => setEditForm((f) => ({ ...f, targetAmount: Number(e.target.value) }))}
                  min={campaign.currentAmount || 0}
                />

                <Input
                  type="number"
                  label="Expected ROI (%)"
                  value={editForm.expectedROI}
                  onChange={(e) => setEditForm((f) => ({ ...f, expectedROI: Number(e.target.value) }))}
                  min={0}
                  step="0.1"
                />

                <Input
                  type="number"
                  label="Duration (days)"
                  value={editForm.duration}
                  onChange={(e) => setEditForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                  min={1}
                />

                <Input
                  type="number"
                  label="Minimum Investment ($)"
                  value={editForm.minInvestment}
                  onChange={(e) => setEditForm((f) => ({ ...f, minInvestment: Number(e.target.value) }))}
                  min={0}
                />

                <Input
                  type="number"
                  label="Minimum Funding Required (%)"
                  value={editForm.minFundingRequired}
                  onChange={(e) => setEditForm((f) => ({ ...f, minFundingRequired: Number(e.target.value) }))}
                  min={0}
                  max={100}
                />

                {campaign.currentAmount > 0 && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                    Target amount cannot be less than {formatCurrency(campaign.currentAmount)} (already raised).
                  </p>
                )}
              </div>

              <Separator className="my-6" />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={isActionLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isActionLoading}
                  className="flex-1"
                >
                  {isActionLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function VehicleHealthCard({ vehicleNftId }: { vehicleNftId: bigint }) {
  const metadata = useVehicleMetadata(vehicleNftId);
  const vehicleInfo = useVehicleInfo(vehicleNftId);

  const meta = metadata.data as
    | [string, string, string, bigint, string, bigint, bigint, bigint]
    | undefined;
  const mileage = meta?.[5];
  const registrationExpiry = meta?.[6];
  const insuranceExpiry = meta?.[7];

  const info = vehicleInfo.data as [any, number, bigint, bigint, bigint] | undefined;
  const maintenanceCount = info?.[3];
  const incidentCount = info?.[4];

  const now = BigInt(Math.floor(Date.now() / 1000));
  const regExpired = registrationExpiry ? registrationExpiry < now : false;
  const insExpired = insuranceExpiry ? insuranceExpiry < now : false;
  const hasAlerts = regExpired || insExpired || (incidentCount && incidentCount > BigInt(0));

  if (metadata.isLoading || vehicleInfo.isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!meta) return null;

  return (
    <Card className={`mt-4 ${hasAlerts ? "border-amber-200 bg-amber-50" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <Heading as="h3">Vehicle Health</Heading>
          </div>
          <Badge variant={hasAlerts ? "warning" : "success"}>
            {hasAlerts ? "Needs Attention" : "Healthy"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-500">Mileage</p>
            <p className="text-lg font-bold text-blue-600">{mileage?.toString() ?? "—"}</p>
            <p className="text-xs text-gray-400">km</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-500">Maintenance</p>
            <p className="text-lg font-bold text-amber-600">{maintenanceCount?.toString() ?? "0"}</p>
            <p className="text-xs text-gray-400">records</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-500">Incidents</p>
            <p className={`text-lg font-bold ${incidentCount && incidentCount > BigInt(0) ? "text-red-600" : "text-green-600"}`}>
              {incidentCount?.toString() ?? "0"}
            </p>
            <p className="text-xs text-gray-400">reported</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Registration</span>
            {registrationExpiry ? (
              <span className={regExpired ? "text-red-600 font-medium" : "text-green-600"}>
                {regExpired ? "Expired" : "Valid"} — {new Date(Number(registrationExpiry) * 1000).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-gray-400">Not set</span>
            )}
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Insurance</span>
            {insuranceExpiry ? (
              <span className={insExpired ? "text-red-600 font-medium" : "text-green-600"}>
                {insExpired ? "Expired" : "Valid"} — {new Date(Number(insuranceExpiry) * 1000).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-gray-400">Not set</span>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Data sourced from VehicleNFT on-chain via Chainlink CRE
        </p>
      </CardContent>
    </Card>
  );
}

const VEHICLE_OP_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: "Unregistered", color: "default" },
  1: { label: "Operational", color: "success" },
  2: { label: "Maintenance Due", color: "warning" },
  3: { label: "Maintenance Overdue", color: "error" },
  4: { label: "Insurance Expired", color: "error" },
  5: { label: "Registration Expired", color: "error" },
  6: { label: "No Permit", color: "warning" },
  7: { label: "Suspended", color: "error" },
  8: { label: "Decommissioned", color: "default" },
};

function VehicleComplianceCard({ vehicleNftId }: { vehicleNftId: bigint }) {
  const validation = useValidateVehicle(vehicleNftId);
  const operational = useIsVehicleOperational(vehicleNftId);

  if (validation.isLoading || operational.isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (validation.isError) return null;

  const result = validation.data as [boolean, number, number] | undefined;
  if (!result) return null;

  const [isValid, reason, status] = result;
  const isOperational = operational.data as boolean | undefined;
  const statusInfo = VEHICLE_OP_STATUS[status] || VEHICLE_OP_STATUS[0];

  return (
    <Card className={`mt-4 ${!isValid ? "border-red-200 bg-red-50" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <Heading as="h3">Operational Compliance</Heading>
          </div>
          <Badge variant={statusInfo.color as any}>{statusInfo.label}</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Overall</span>
            <Badge variant={isValid ? "success" : "error"}>
              {isValid ? "Compliant" : "Non-Compliant"}
            </Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Can Operate</span>
            <Badge variant={isOperational ? "success" : "error"}>
              {isOperational ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        {!isValid && (
          <div className="mt-3 bg-red-100 border border-red-200 rounded-lg p-2">
            <p className="text-xs text-red-800">
              This vehicle is non-compliant. Check registration, insurance, and maintenance status in the admin compliance dashboard.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Verified via OperationalCompliance contract + Chainlink CRE
        </p>
      </CardContent>
    </Card>
  );
}
