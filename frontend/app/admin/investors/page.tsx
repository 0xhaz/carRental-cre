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
import { useInvestorRequestManager } from "@/hooks/useContracts";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";

interface InvestorUser {
  _id: string;
  name: string;
  email: string;
  walletAddress: string;
  createdAt: string;
  kyc: {
    kycStatus: string;
    investorType: string | number | null;
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
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  const { isConnected } = useAccount();

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
    return true;
  });

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
      {!isConnected && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Connect Admin Wallet:</strong> You need to connect your admin wallet to approve
            or reject investor requests on-chain.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "approved"] as const).map((f) => (
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

  // Transaction hooks for admin actions
  const { data: approveHash, writeContract: writeApprove } = useWriteContract();
  const { data: rejectHash, writeContract: writeReject } = useWriteContract();
  const { data: createWalletHash, writeContract: writeCreateWallet } = useWriteContract();

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  const { isLoading: isRejecting, isSuccess: rejectSuccess } = useWaitForTransactionReceipt({
    hash: rejectHash,
  });
  const { isLoading: isCreatingWallet, isSuccess: createWalletSuccess } =
    useWaitForTransactionReceipt({ hash: createWalletHash });

  useEffect(() => {
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
  }, [approveSuccess, rejectSuccess, createWalletSuccess, investor.name, refetch]);

  const handleApprove = () => {
    writeApprove({
      address: contractAddr,
      abi,
      functionName: "approveRequest",
      args: [investor.walletAddress as `0x${string}`],
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
    });
  };

  const handleCreateWallet = () => {
    writeCreateWallet({
      address: contractAddr,
      abi,
      functionName: "createMultiSigWallet",
      args: [investor.walletAddress as `0x${string}`],
    });
  };

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

        {/* Admin Actions */}
        <div className="flex gap-3">
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

          {/* No on-chain request yet */}
          {onChainStatus === 0 && (
            <p className="text-sm text-gray-500 italic">
              No on-chain request yet. Investor needs to initiate from their dashboard.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
