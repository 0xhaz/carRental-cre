"use client";

import { useState, useEffect } from "react";
import {
  Heading,
  Paragraph,
  Card,
  CardContent,
  Button,
  Badge,
} from "@/components/ui";
import { EthUsdDisplay } from "@/components/web3";
import { kycApi } from "@/lib/api";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useInvestorRequestManager, useIdentityRegistry, useInvestorTypeRegistry } from "@/hooks/useContracts";
import { useReadContract } from "wagmi";
import { formatEther, parseGwei } from "viem";
import { toast } from "react-hot-toast";

interface InvestorUser {
  _id: string;
  name: string;
  email: string;
  walletAddress: string;
  createdAt: string;
  kyc: {
    kycId?: string;
    kycStatus: string;
    investorType: string | number | null;
    upgradeRequest?: {
      isUpgrade: boolean;
      currentType: number;
      targetType: number;
      reason?: string;
      status: "pending" | "approved" | "rejected";
      requestedAt?: string;
    } | null;
  };
}

const STATUS_LABELS = ["NONE", "PENDING", "WALLET_CREATED", "TOKENS_LOCKED", "APPROVED", "REJECTED"];
const TYPE_LABELS = ["NORMAL", "RETAIL", "ACCREDITED", "INSTITUTIONAL"];

const STATUS_COLORS: Record<number, string> = {
  0: "default",
  1: "warning",
  2: "primary",
  3: "primary",
  4: "success",
  5: "error",
};

export default function AdminInvestorsPage() {
  const [investors, setInvestors] = useState<InvestorUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "upgrades">("all");

  const { isConnected, address: connectedAddress } = useAccount();
  const { address: identityRegistryAddr, abi: identityAbi } = useIdentityRegistry();

  // Check if connected wallet is contract owner
  const { data: contractOwner, error: ownerError, isLoading: ownerLoading } = useReadContract({
    address: identityRegistryAddr,
    abi: identityAbi,
    functionName: "owner",
    query: { enabled: isConnected },
  });

  // Check if connected wallet is an agent
  const { data: isAgentRaw, error: agentError, isLoading: agentLoading } = useReadContract({
    address: identityRegistryAddr,
    abi: identityAbi,
    functionName: "isAgent",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: !!connectedAddress },
  });
  const isAgent = isAgentRaw === true;
  const isOwner = connectedAddress && contractOwner
    ? connectedAddress.toLowerCase() === (contractOwner as string).toLowerCase()
    : false;
  const isAuthorized = isAgent || isOwner;
  const authLoading = ownerLoading || agentLoading;

  useEffect(() => {
    loadInvestors();
  }, []);

  const loadInvestors = async () => {
    setIsLoading(true);
    try {
      const response = await kycApi.getInvestorUsers();
      if (response.success) {
        setInvestors(response.data);
      }
    } catch (error) {
      console.error("Failed to load investors:", error);
      toast.error("Failed to load investor list");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvestors = investors.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "pending") return inv.kyc.kycStatus === "pending" || inv.kyc.kycStatus === "under_review";
    if (filter === "approved") return inv.kyc.kycStatus === "approved";
    if (filter === "upgrades") return inv.kyc.upgradeRequest?.isUpgrade && inv.kyc.upgradeRequest?.status === "pending";
    return true;
  });

  const upgradeCount = investors.filter(
    (inv) => inv.kyc.upgradeRequest?.isUpgrade && inv.kyc.upgradeRequest?.status === "pending"
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Investor Management
        </Heading>
        <Paragraph className="text-lg">
          Review investor requests and manage on-chain approvals
        </Paragraph>
      </div>

      {/* Wallet Warning */}
      {!isConnected ? (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Connect Admin Wallet:</strong> You need to connect your admin wallet to approve
            or reject investor requests on-chain.
          </p>
        </div>
      ) : authLoading ? (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            Checking wallet authorization...
          </p>
        </div>
      ) : isAuthorized ? (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Wallet Connected:</strong>{" "}
            <code className="text-xs bg-green-100 px-1 rounded">{connectedAddress}</code>{" "}
            ({isOwner ? "Owner" : "Agent"})
          </p>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Unauthorized Wallet:</strong> Connected wallet{" "}
            <code className="text-xs bg-red-100 px-1 rounded">{connectedAddress}</code>{" "}
            is not the contract owner or an authorized agent.
          </p>
          {!!contractOwner && (
            <p className="text-sm text-red-700 mt-1">
              Contract owner: <code className="text-xs bg-red-100 px-1 rounded">{String(contractOwner)}</code>
            </p>
          )}
          {(ownerError || agentError) && (
            <p className="text-sm text-red-700 mt-1">
              Debug: {ownerError ? `owner() error: ${ownerError.message}` : ""}{" "}
              {agentError ? `isAgent() error: ${agentError.message}` : ""}
            </p>
          )}
          <p className="text-xs text-red-600 mt-1">
            Registry: {identityRegistryAddr} | owner={String(contractOwner)} | isAgent={String(isAgentRaw)}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "approved", "upgrades"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}{" "}
            {f === "all" ? `(${investors.length})` : ""}
            {f === "upgrades" && upgradeCount > 0 ? ` (${upgradeCount})` : ""}
          </button>
        ))}
      </div>

      {/* Investor List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-48 mb-3" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-96" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredInvestors.length > 0 ? (
        <div className="space-y-4">
          {filteredInvestors.map((investor) => (
            <InvestorRequestCard
              key={investor._id}
              investor={investor}
              onRefresh={loadInvestors}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No investors found matching this filter.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvestorRequestCard({
  investor,
  onRefresh,
}: {
  investor: InvestorUser;
  onRefresh: () => void;
}) {
  const { address: contractAddr, abi } = useInvestorRequestManager();
  const { address: identityRegistryAddr, abi: identityAbi } = useIdentityRegistry();
  const { address: investorTypeRegistryAddr, abi: investorTypeAbi } = useInvestorTypeRegistry();

  // Check if investor is verified on-chain (IdentityRegistry)
  const { data: isVerifiedRaw, refetch: refetchVerified } = useReadContract({
    address: identityRegistryAddr,
    abi: identityAbi,
    functionName: "isVerified",
    args: [investor.walletAddress as `0x${string}`],
    query: {
      enabled: !!investor.walletAddress,
    },
  });
  const isVerifiedOnChain = isVerifiedRaw === true;

  // Read on-chain status for this investor
  const { data: request, refetch } = useReadContract({
    address: contractAddr,
    abi,
    functionName: "getRequest",
    args: [investor.walletAddress as `0x${string}`],
    query: {
      enabled: !!investor.walletAddress,
    },
  });

  const onChainType = request ? Number((request as any)[0]) : 0;
  const requiredLock = request ? ((request as any)[1] as bigint) : BigInt(0);
  const multiSigWallet = request ? ((request as any)[2] as string) : "";
  const onChainStatus = request ? Number((request as any)[3]) : 0;
  const rejectionReason = request ? ((request as any)[6] as string) : "";

  // Read the investor's actual type from InvestorTypeRegistry (not the request type)
  const { data: registryTypeRaw, refetch: refetchRegistryType } = useReadContract({
    address: investorTypeRegistryAddr,
    abi: investorTypeAbi,
    functionName: "getInvestorType",
    args: [investor.walletAddress as `0x${string}`],
    query: { enabled: !!investor.walletAddress },
  });
  const registryType = registryTypeRaw !== undefined ? Number(registryTypeRaw) : 0;

  // Transaction hooks for admin actions
  const { data: registerHash, writeContract: writeRegister, error: registerError } = useWriteContract();
  const { data: approveHash, writeContract: writeApprove } = useWriteContract();
  const { data: rejectHash, writeContract: writeReject } = useWriteContract();
  const { data: createWalletHash, writeContract: writeCreateWallet } = useWriteContract();
  const { data: upgradeOnChainHash, writeContract: writeUpgradeOnChain, error: upgradeOnChainError } = useWriteContract();
  const { data: createUpgradeWalletHash, writeContract: writeCreateUpgradeWallet, error: createUpgradeWalletError } = useWriteContract();
  const { data: downgradeOnChainHash, writeContract: writeDowngradeOnChain, error: downgradeOnChainError } = useWriteContract();

  const { isLoading: isRegistering, isSuccess: registerSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  });
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  const { isLoading: isRejecting, isSuccess: rejectSuccess } = useWaitForTransactionReceipt({
    hash: rejectHash,
  });
  const { isLoading: isCreatingWallet, isSuccess: createWalletSuccess } =
    useWaitForTransactionReceipt({ hash: createWalletHash });
  const { isLoading: isUpgradingOnChain, isSuccess: upgradeOnChainSuccess } =
    useWaitForTransactionReceipt({ hash: upgradeOnChainHash });
  const { isLoading: isCreatingUpgradeWallet, isSuccess: createUpgradeWalletSuccess } =
    useWaitForTransactionReceipt({ hash: createUpgradeWalletHash });
  const { isLoading: isDowngradingOnChain, isSuccess: downgradeOnChainSuccess } =
    useWaitForTransactionReceipt({ hash: downgradeOnChainHash });

  // State for DB upgrade/downgrade actions
  const [isApprovingUpgrade, setIsApprovingUpgrade] = useState(false);
  const [isRejectingUpgrade, setIsRejectingUpgrade] = useState(false);
  const [isDowngradingDB, setIsDowngradingDB] = useState(false);

  useEffect(() => {
    if (registerSuccess) {
      toast.success(`Identity registered on-chain for ${investor.name}!`);
      refetchVerified();
    }
    if (approveSuccess) {
      toast.success(`Investor ${investor.name} approved!`);
      refetch();
    }
    if (rejectSuccess) {
      toast.success(`Investor ${investor.name} rejected.`);
      refetch();
    }
    if (createWalletSuccess) {
      toast.success(`MultiSig wallet created for ${investor.name}!`);
      refetch();
    }
    if (upgradeOnChainSuccess) {
      toast.success(`Investor type upgraded on-chain for ${investor.name}! Now create their MultiSig wallet.`);
      refetch();
      refetchRegistryType();
      onRefresh();
    }
    if (createUpgradeWalletSuccess) {
      toast.success(`MultiSig wallet created for upgraded investor ${investor.name}!`);
      // Notify the investor about the new wallet via backend
      if (investor.kyc.kycId) {
        kycApi.notifyUpgradeWalletCreated(investor.kyc.kycId).catch(() => {});
      }
      refetch();
      onRefresh();
    }
    if (downgradeOnChainSuccess) {
      toast.success(`Investor type downgraded on-chain for ${investor.name}!`);
      refetch();
      refetchRegistryType();
      onRefresh();
    }
  }, [registerSuccess, approveSuccess, rejectSuccess, createWalletSuccess, upgradeOnChainSuccess, createUpgradeWalletSuccess, downgradeOnChainSuccess, investor.name, investor.kyc.kycId, refetch, refetchVerified, refetchRegistryType, onRefresh]);

  useEffect(() => {
    if (registerError) {
      const msg = (registerError as any)?.shortMessage || "Failed to register identity on-chain";
      toast.error(msg);
    }
  }, [registerError]);

  useEffect(() => {
    if (upgradeOnChainError) {
      const msg = (upgradeOnChainError as any)?.shortMessage || "Failed to upgrade investor type on-chain";
      toast.error(msg);
    }
  }, [upgradeOnChainError]);

  useEffect(() => {
    if (downgradeOnChainError) {
      const msg = (downgradeOnChainError as any)?.shortMessage || "Failed to downgrade investor type on-chain";
      toast.error(msg);
    }
  }, [downgradeOnChainError]);

  useEffect(() => {
    if (createUpgradeWalletError) {
      const errMsg = (createUpgradeWalletError as any)?.shortMessage || "";
      const msg = errMsg.includes("BankAndUserCannotBeSame")
        ? "Cannot create MultiSig wallet: investor address is the same as the bank/platform address"
        : errMsg || "Failed to create MultiSig wallet for upgrade";
      toast.error(msg);
    }
  }, [createUpgradeWalletError]);

  // Gas config to avoid "max fee per gas less than block base fee" on Sepolia
  const gasOverrides = { maxFeePerGas: parseGwei("30"), maxPriorityFeePerGas: parseGwei("2") };

  const handleRegisterIdentity = () => {
    writeRegister({
      address: identityRegistryAddr,
      abi: identityAbi,
      functionName: "registerIdentity",
      args: [
        investor.walletAddress as `0x${string}`, // _user
        investor.walletAddress as `0x${string}`, // _identity (use wallet as identity)
        1, // _country (default: 1 = US)
      ],
      ...gasOverrides,
    });
  };

  const handleApprove = () => {
    writeApprove({
      address: contractAddr,
      abi,
      functionName: "approveRequest",
      args: [investor.walletAddress as `0x${string}`],
      ...gasOverrides,
    });
  };

  const handleReject = () => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    writeReject({
      address: contractAddr,
      abi,
      functionName: "rejectRequest",
      args: [investor.walletAddress as `0x${string}`, reason],
      ...gasOverrides,
    });
  };

  const handleCreateWallet = () => {
    writeCreateWallet({
      address: contractAddr,
      abi,
      functionName: "createMultiSigWallet",
      args: [investor.walletAddress as `0x${string}`],
      ...gasOverrides,
    });
  };

  const handleApproveUpgrade = async () => {
    if (!investor.kyc.kycId) return;
    setIsApprovingUpgrade(true);
    try {
      const response = await kycApi.approveUpgrade(investor.kyc.kycId);
      if (response.success) {
        toast.success(`Upgrade approved for ${investor.name}. Now upgrade on-chain.`);
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve upgrade");
    } finally {
      setIsApprovingUpgrade(false);
    }
  };

  const handleRejectUpgrade = async () => {
    if (!investor.kyc.kycId) return;
    const reason = prompt("Enter rejection reason for upgrade:");
    if (!reason) return;
    setIsRejectingUpgrade(true);
    try {
      const response = await kycApi.rejectUpgrade(investor.kyc.kycId, reason);
      if (response.success) {
        toast.success(`Upgrade rejected for ${investor.name}`);
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject upgrade");
    } finally {
      setIsRejectingUpgrade(false);
    }
  };

  const handleUpgradeOnChain = () => {
    const targetType = investor.kyc.upgradeRequest?.targetType;
    if (!targetType) return;
    writeUpgradeOnChain({
      address: investorTypeRegistryAddr,
      abi: investorTypeAbi,
      functionName: "upgradeInvestorType",
      args: [investor.walletAddress as `0x${string}`, targetType],
      ...gasOverrides,
    });
  };

  const handleDowngradeDB = async (targetType: number) => {
    if (!investor.kyc.kycId) return;
    setIsDowngradingDB(true);
    try {
      const response = await kycApi.downgradeInvestor(investor.kyc.kycId, targetType);
      if (response.success) {
        toast.success(`DB downgrade to ${TYPE_LABELS[targetType]} done for ${investor.name}. Now downgrade on-chain.`);
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to downgrade investor");
    } finally {
      setIsDowngradingDB(false);
    }
  };

  const handleDowngradeOnChain = (targetType: number) => {
    writeDowngradeOnChain({
      address: investorTypeRegistryAddr,
      abi: investorTypeAbi,
      functionName: "downgradeInvestorType",
      args: [investor.walletAddress as `0x${string}`, targetType],
      ...gasOverrides,
    });
  };

  const handleDowngrade = (targetType: number) => {
    handleDowngradeDB(targetType);
  };

  const handleCreateUpgradeWallet = () => {
    writeCreateUpgradeWallet({
      address: contractAddr,
      abi,
      functionName: "createMultiSigWalletForUpgrade",
      args: [investor.walletAddress as `0x${string}`],
      ...gasOverrides,
    });
  };

  const upgradeReq = investor.kyc.upgradeRequest;
  const statusVariant = (STATUS_COLORS[onChainStatus] || "default") as any;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-bold text-gray-900">{investor.name}</h3>
              <Badge variant={statusVariant}>
                {STATUS_LABELS[onChainStatus] || "UNKNOWN"}
              </Badge>
              {investor.kyc.kycStatus && (
                <Badge
                  variant={
                    investor.kyc.kycStatus === "approved"
                      ? "success"
                      : investor.kyc.kycStatus === "rejected"
                      ? "error"
                      : "warning"
                  }
                >
                  KYC: {investor.kyc.kycStatus}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{investor.email}</p>
          </div>
          {onChainType > 0 && (
            <Badge variant="primary">{TYPE_LABELS[onChainType]}</Badge>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Wallet</p>
            <p className="text-sm font-mono truncate" title={investor.walletAddress}>
              {investor.walletAddress.slice(0, 8)}...{investor.walletAddress.slice(-6)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Investor Type</p>
            <p className="text-sm font-semibold">
              {onChainType > 0 ? TYPE_LABELS[onChainType] : investor.kyc.investorType || "Not set"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Lock Required</p>
            {requiredLock > BigInt(0) ? (
              <EthUsdDisplay amountWei={requiredLock} primary="ETH" showBoth={false} />
            ) : (
              <p className="text-sm text-gray-400">-</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Registered</p>
            <p className="text-sm">{new Date(investor.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* MultiSig Wallet (if created) */}
        {multiSigWallet && multiSigWallet !== "0x0000000000000000000000000000000000000000" && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">MultiSig Wallet</p>
            <p className="text-sm font-mono">{multiSigWallet}</p>
          </div>
        )}

        {/* Rejection Reason */}
        {onChainStatus === 5 && rejectionReason && (
          <div className="mb-4 p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-red-500">Rejection Reason</p>
            <p className="text-sm text-red-800">{rejectionReason}</p>
          </div>
        )}

        {/* On-Chain Identity Status */}
        <div className="mb-4 flex items-center gap-2">
          {isVerifiedOnChain ? (
            <Badge variant="success">Identity Verified On-Chain</Badge>
          ) : investor.kyc.kycStatus === "approved" ? (
            <Badge variant="warning">Not Registered On-Chain</Badge>
          ) : null}
        </div>

        {/* Upgrade Request Section */}
        {upgradeReq?.isUpgrade && (
          <div className={`mb-4 p-4 rounded-lg border ${
            upgradeReq.status === "pending"
              ? "bg-orange-50 border-orange-200"
              : upgradeReq.status === "approved"
              ? "bg-blue-50 border-blue-200"
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={upgradeReq.status === "pending" ? "warning" : upgradeReq.status === "approved" ? "primary" : "default"}>
                Upgrade {upgradeReq.status === "pending" ? "Requested" : upgradeReq.status === "approved" ? "Approved" : "Rejected"}
              </Badge>
              <span className="text-sm font-medium">
                {TYPE_LABELS[upgradeReq.currentType]} &rarr; {TYPE_LABELS[upgradeReq.targetType]}
              </span>
            </div>
            {upgradeReq.reason && (
              <p className="text-sm text-gray-600 mb-2">Reason: {upgradeReq.reason}</p>
            )}

            <div className="flex gap-2 mt-2 flex-wrap">
              {upgradeReq.status === "pending" && (
                <>
                  <Button onClick={handleApproveUpgrade} disabled={isApprovingUpgrade} size="sm">
                    {isApprovingUpgrade ? "Approving..." : "Approve Upgrade"}
                  </Button>
                  <Button onClick={handleRejectUpgrade} disabled={isRejectingUpgrade} variant="outline" size="sm">
                    {isRejectingUpgrade ? "Rejecting..." : "Reject Upgrade"}
                  </Button>
                </>
              )}
              {upgradeReq.status === "approved" && (
                <>
                  {/* Only show upgrade button if type not yet upgraded on-chain */}
                  {registryType < upgradeReq.targetType && (
                    <Button onClick={handleUpgradeOnChain} disabled={isUpgradingOnChain} size="sm">
                      {isUpgradingOnChain ? "Upgrading On-Chain..." : `Upgrade Type On-Chain (→ ${TYPE_LABELS[upgradeReq.targetType]})`}
                    </Button>
                  )}
                  {/* Show Create MultiSig Wallet button after type is upgraded on-chain, for Accredited/Institutional without a wallet */}
                  {registryType >= upgradeReq.targetType && upgradeReq.targetType > 1 && (!multiSigWallet || multiSigWallet === "0x0000000000000000000000000000000000000000") && (
                    <Button onClick={handleCreateUpgradeWallet} disabled={isCreatingUpgradeWallet} size="sm">
                      {isCreatingUpgradeWallet ? "Creating Wallet..." : "Create MultiSig Wallet"}
                    </Button>
                  )}
                  {/* Type upgraded + wallet created = all done */}
                  {registryType >= upgradeReq.targetType && multiSigWallet && multiSigWallet !== "0x0000000000000000000000000000000000000000" && (
                    <Badge variant="success">Upgrade Complete</Badge>
                  )}
                </>
              )}
            </div>
            {upgradeReq.status === "approved" && (
              <p className="text-xs text-gray-500 mt-2">
                {registryType < upgradeReq.targetType
                  ? "Step 1: Upgrade type on-chain. Step 2: Create MultiSig wallet."
                  : multiSigWallet && multiSigWallet !== "0x0000000000000000000000000000000000000000"
                  ? `Type upgraded. MultiSig wallet: ${multiSigWallet.slice(0, 10)}...${multiSigWallet.slice(-8)}`
                  : "Type upgraded on-chain. Now create MultiSig wallet for the investor."
                }
              </p>
            )}
          </div>
        )}

        {/* Admin Actions */}
        <div className="flex gap-3 flex-wrap">
          {/* KYC approved but not registered on-chain → register identity */}
          {investor.kyc.kycStatus === "approved" && !isVerifiedOnChain && (
            <Button onClick={handleRegisterIdentity} disabled={isRegistering} size="sm">
              {isRegistering ? "Registering..." : "Register Identity On-Chain"}
            </Button>
          )}

          {/* TOKENS_LOCKED → can approve or reject */}
          {onChainStatus === 3 && (
            <>
              <Button onClick={handleApprove} disabled={isApproving} size="sm">
                {isApproving ? "Approving..." : "Approve Investor"}
              </Button>
              <Button onClick={handleReject} disabled={isRejecting} variant="outline" size="sm">
                {isRejecting ? "Rejecting..." : "Reject"}
              </Button>
            </>
          )}

          {/* PENDING + ACCREDITED/INSTITUTIONAL → create MultiSig */}
          {onChainStatus === 1 && onChainType > 1 && (
            <Button onClick={handleCreateWallet} disabled={isCreatingWallet} size="sm">
              {isCreatingWallet ? "Creating Wallet..." : "Create MultiSig Wallet"}
            </Button>
          )}

          {/* No on-chain request yet and identity registered */}
          {onChainStatus === 0 && isVerifiedOnChain && (
            <p className="text-sm text-gray-500 italic">
              Identity registered. Investor needs to request status from their dashboard.
            </p>
          )}

          {/* No on-chain request and not registered */}
          {onChainStatus === 0 && !isVerifiedOnChain && investor.kyc.kycStatus !== "approved" && (
            <p className="text-sm text-gray-500 italic">
              KYC not yet approved.
            </p>
          )}
        </div>

        {/* Downgrade Section — visible when investor is Accredited (2) or Institutional (3) on-chain */}
        {registryType > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-500">Downgrade:</span>
              {registryType === 3 && (
                <Button
                  onClick={() => handleDowngrade(2)}
                  disabled={isDowngradingDB}
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  {isDowngradingDB ? "Downgrading..." : "Downgrade to Accredited"}
                </Button>
              )}
              <Button
                onClick={() => handleDowngrade(1)}
                disabled={isDowngradingDB}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                {isDowngradingDB ? "Downgrading..." : "Downgrade to Retail"}
              </Button>
              {/* On-chain downgrade button — appears when DB type < on-chain type */}
              {investor.kyc.investorType !== null && Number(investor.kyc.investorType) < registryType && (
                <Button
                  onClick={() => handleDowngradeOnChain(Number(investor.kyc.investorType))}
                  disabled={isDowngradingOnChain}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isDowngradingOnChain ? "Downgrading On-Chain..." : `Downgrade On-Chain (→ ${TYPE_LABELS[Number(investor.kyc.investorType)]})`}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
