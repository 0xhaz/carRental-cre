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
} from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import { Investment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { investmentApi } from "@/lib/api";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { SEPOLIA_CHAIN_ID, getEtherscanUrl } from "@/constants/contracts";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

function OnChainTokenBalance({
  tokenAddress,
  label,
  variant,
}: {
  tokenAddress: string;
  label: string;
  variant: "asset" | "revenue";
}) {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!tokenAddress },
  });
  const { data: symbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!tokenAddress },
  });
  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!tokenAddress },
  });

  const formatted =
    balance && decimals
      ? parseFloat(formatUnits(balance as bigint, decimals as number))
      : 0;
  const sym = (symbol as string) || (variant === "asset" ? "AST" : "REV");
  const color = variant === "asset" ? "blue" : "green";

  return (
    <div className={`bg-${color}-50 rounded-lg p-4`}>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold text-${color}-600`}>
        {formatted.toLocaleString(undefined, { maximumFractionDigits: 4 })} {sym}
      </p>
      <div className="mt-2">
        <a
          href={getEtherscanUrl(SEPOLIA_CHAIN_ID, tokenAddress, "address")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-blue-500 hover:underline font-mono"
        >
          {tokenAddress.slice(0, 10)}...{tokenAddress.slice(-6)}
        </a>
      </div>
    </div>
  );
}

export default function InvestmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const investmentId = params.id as string;
  const { isConnected } = useAccount();

  const [investment, setInvestment] = useState<Investment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInvestment = async () => {
      setIsLoading(true);
      try {
        const response = await investmentApi.getDetails(investmentId);
        if (response.success) {
          setInvestment(response.data);
        }
      } catch (error: any) {
        console.error("Failed to load investment:", error);
        toast.error(error.response?.data?.message || "Failed to load investment");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvestment();
  }, [investmentId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Heading as="h2" className="mb-4">
            Investment Not Found
          </Heading>
          <Paragraph className="mb-6">
            This investment doesn&apos;t exist or has been removed.
          </Paragraph>
          <Button onClick={() => router.push("/investor/portfolio")}>
            Back to Portfolio
          </Button>
        </Card>
      </div>
    );
  }

  // Extract populated vehicle data
  const vehicle = typeof investment.vehicle === "object" ? (investment.vehicle as any) : null;
  const assetTokenAddr = vehicle?.assetTokenAddress;
  const revenueTokenAddr = vehicle?.revenueTokenAddress;

  // Calculate metrics
  const totalValue = investment.amount * 1.1;
  const profitLoss = totalValue - investment.amount + investment.totalRevenueEarned;
  const profitLossPercentage = (profitLoss / investment.amount) * 100;
  const isProfit = profitLoss >= 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/investor/portfolio")}
        className="mb-6"
      >
        &larr; Back to Portfolio
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle & Investment Overview */}
          <Card className="overflow-hidden">
            {vehicle && (
              <div className="relative h-64 md:h-80">
                <Image
                  src={vehicle.image || "/assets/car_image1.png"}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                  width={800}
                  height={400}
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge
                    variant={
                      investment.status === "active"
                        ? "success"
                        : investment.status === "cancelled"
                          ? "error"
                          : "default"
                    }
                    className="shadow-lg"
                  >
                    {investment.status}
                  </Badge>
                </div>
              </div>
            )}
            <CardContent className="p-6">
              <div className="mb-4">
                <Heading as="h1" className="mb-2">
                  {vehicle
                    ? `${vehicle.brand} ${vehicle.model}`
                    : "Investment"}
                </Heading>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  {vehicle?.location && <span>📍 {vehicle.location}</span>}
                  <span>💼 ID: {investment._id.slice(-8)}</span>
                  <span>📅 {new Date(investment.investedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Tx Hash */}
              {(investment as any).txHash && (
                <div className="mt-3">
                  <ExplorerLink
                    value={(investment as any).txHash}
                    type="tx"
                    label={`Tx: ${(investment as any).txHash.slice(0, 14)}...`}
                    className="text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investment Performance */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" className="mb-4">
                Investment Performance
              </Heading>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Initial Investment</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(investment.amount)}
                  </p>
                  {(investment as any).amountEth > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {(investment as any).amountEth} ETH
                    </p>
                  )}
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Current Value</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Revenue Earned</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(investment.totalRevenueEarned)}
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
                  <p className="text-sm text-gray-600 mb-1">Total Return</p>
                  <p className={`text-2xl font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                    {isProfit ? "+" : ""}
                    {formatCurrency(profitLoss)}
                  </p>
                  <p className={`text-xs mt-1 ${isProfit ? "text-green-600" : "text-red-600"}`}>
                    {isProfit ? "+" : ""}
                    {profitLossPercentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* On-Chain Token Holdings */}
          {isConnected && (assetTokenAddr || revenueTokenAddr) && (
            <Card>
              <CardContent className="p-6">
                <Heading as="h2" className="mb-4">
                  On-Chain Token Holdings
                </Heading>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assetTokenAddr && (
                    <OnChainTokenBalance
                      tokenAddress={assetTokenAddr}
                      label="Asset Tokens"
                      variant="asset"
                    />
                  )}
                  {revenueTokenAddr && (
                    <OnChainTokenBalance
                      tokenAddress={revenueTokenAddr}
                      label="Revenue Tokens"
                      variant="revenue"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <Heading as="h3" className="mb-4">
                Investment Details
              </Heading>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold">{formatCurrency(investment.amount)}</span>
                </div>
                {(investment as any).amountEth > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount (ETH)</span>
                    <span className="font-semibold">{(investment as any).amountEth} ETH</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Investment Date</span>
                  <span className="font-semibold">
                    {new Date(investment.investedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <Badge
                    variant={
                      investment.status === "active"
                        ? "success"
                        : investment.status === "cancelled"
                          ? "error"
                          : "default"
                    }
                  >
                    {investment.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue Earned</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(investment.totalRevenueEarned)}
                  </span>
                </div>
              </div>

              {/* Contract Addresses */}
              {(assetTokenAddr || revenueTokenAddr) && (
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Contract Addresses</p>
                  <div className="space-y-2">
                    {assetTokenAddr && (
                      <div>
                        <p className="text-xs text-gray-500">Asset Token</p>
                        <a
                          href={getEtherscanUrl(SEPOLIA_CHAIN_ID, assetTokenAddr, "address")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-blue-500 hover:underline"
                        >
                          {assetTokenAddr.slice(0, 10)}...{assetTokenAddr.slice(-6)}
                        </a>
                      </div>
                    )}
                    {revenueTokenAddr && (
                      <div>
                        <p className="text-xs text-gray-500">Revenue Token</p>
                        <a
                          href={getEtherscanUrl(SEPOLIA_CHAIN_ID, revenueTokenAddr, "address")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-green-500 hover:underline"
                        >
                          {revenueTokenAddr.slice(0, 10)}...{revenueTokenAddr.slice(-6)}
                        </a>
                      </div>
                    )}
                    {vehicle?.vehicleNftId && (
                      <div>
                        <p className="text-xs text-gray-500">Vehicle NFT ID</p>
                        <p className="text-xs font-mono text-gray-700">#{vehicle.vehicleNftId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {vehicle && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/investor/vehicle/${vehicle._id}`)}
                  >
                    View Campaign
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/investor/portfolio")}
                >
                  Back to Portfolio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
