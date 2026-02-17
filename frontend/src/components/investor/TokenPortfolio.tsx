"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Card, CardContent, Badge, Skeleton } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import { Investment } from "@/types";

// Minimal ERC20 ABI for reading balance, name, symbol, and decimals
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
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

interface TokenBalanceProps {
  tokenAddress: `0x${string}`;
  userAddress: `0x${string}`;
  label: string;
  variant?: "asset" | "revenue";
}

function TokenBalance({ tokenAddress, userAddress, label, variant = "asset" }: TokenBalanceProps) {
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress],
  });

  const { data: tokenName } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "name",
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  if (balanceLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  const formattedBalance = balance && decimals
    ? formatUnits(balance as bigint, decimals as number)
    : "0";

  const numericBalance = parseFloat(formattedBalance);
  const hasBalance = numericBalance > 0;

  // Use on-chain name (e.g. "BMW X5 Asset") with symbol, fallback to prop label
  const displayLabel = tokenName && symbol
    ? `${tokenName} (${symbol})`
    : tokenName
    ? (tokenName as string)
    : label;

  return (
    <div className={`p-4 rounded-lg ${variant === "asset" ? "bg-blue-50" : "bg-green-50"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-600">{displayLabel}</p>
        {hasBalance && (
          <Badge variant={variant === "asset" ? "default" : "success"} className="text-xs">
            Active
          </Badge>
        )}
      </div>
      <p className={`text-2xl font-bold ${variant === "asset" ? "text-blue-600" : "text-green-600"}`}>
        {parseFloat(formattedBalance).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        })}{" "}
        <span className="text-sm">{symbol || "TOKENS"}</span>
      </p>
      <div className="mt-1">
        <ExplorerLink value={tokenAddress} type="address" className="text-xs text-gray-500" />
      </div>
    </div>
  );
}

/** Extract unique vehicles with token addresses from populated investments */
function extractVehicleTokens(investments: Investment[]): Array<{
  vehicleId: string;
  vehicleName: string;
  assetTokenAddress?: string;
  revenueTokenAddress?: string;
}> {
  const seen = new Set<string>();
  const result: Array<{
    vehicleId: string;
    vehicleName: string;
    assetTokenAddress?: string;
    revenueTokenAddress?: string;
  }> = [];

  for (const inv of investments) {
    const v = inv.vehicle as any;
    if (!v || typeof v !== "object") continue;
    const id = v._id || String(inv.vehicle);
    if (seen.has(id)) continue;
    seen.add(id);

    if (v.assetTokenAddress || v.revenueTokenAddress) {
      result.push({
        vehicleId: id,
        vehicleName: `${v.brand || "Vehicle"} ${v.model || ""}`.trim(),
        assetTokenAddress: v.assetTokenAddress,
        revenueTokenAddress: v.revenueTokenAddress,
      });
    }
  }
  return result;
}

export interface TokenPortfolioProps {
  investments?: Investment[];
  className?: string;
}

export function TokenPortfolio({ investments = [], className }: TokenPortfolioProps) {
  const { address: userAddress, isConnected } = useAccount();

  if (!isConnected || !userAddress) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl">🔌</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-gray-600">
            Please connect your wallet to view your token portfolio
          </p>
        </CardContent>
      </Card>
    );
  }

  const vehicleTokens = extractVehicleTokens(investments);

  if (vehicleTokens.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl">💼</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Token Holdings</h3>
          <p className="text-sm text-gray-600">
            No tokenized vehicles found in your portfolio yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Token Portfolio</h2>
            <Badge variant="default">{vehicleTokens.length} Vehicle{vehicleTokens.length > 1 ? "s" : ""}</Badge>
          </div>
          <p className="text-sm text-gray-600">
            Your AssetToken and RevenueToken holdings across all vehicle investments
          </p>
        </div>

        <div className="space-y-6">
          {vehicleTokens.map((vt) => (
            <div key={vt.vehicleId} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
              <h3 className="font-semibold text-gray-900 mb-3">{vt.vehicleName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vt.assetTokenAddress ? (
                  <TokenBalance
                    tokenAddress={vt.assetTokenAddress as `0x${string}`}
                    userAddress={userAddress}
                    label={`${vt.vehicleName} Asset`}
                    variant="asset"
                  />
                ) : (
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="text-xs text-gray-600 mb-1">{vt.vehicleName} Asset</p>
                    <p className="text-lg font-bold text-gray-400">Not deployed</p>
                  </div>
                )}
                {vt.revenueTokenAddress ? (
                  <TokenBalance
                    tokenAddress={vt.revenueTokenAddress as `0x${string}`}
                    userAddress={userAddress}
                    label={`${vt.vehicleName} Revenue`}
                    variant="revenue"
                  />
                ) : (
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="text-xs text-gray-600 mb-1">{vt.vehicleName} Revenue</p>
                    <p className="text-lg font-bold text-gray-400">Not deployed</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TokenPortfolioSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-6">
          <div>
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
