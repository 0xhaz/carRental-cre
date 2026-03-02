"use client";

import { useState } from "react";
import { Card, CardContent, Heading, Button, Input, Badge, Separator } from "@/components/ui";
import {
  useAssetTokenBalance,
  useAssetTokenFreeBalance,
  useAssetTokenIsFrozen,
  useAssetTokenFrozenTokens,
  useAssetTokenPaused,
  useAssetTokenIsAgent,
  useAssetTokenTotalSupply,
  useAssetTokenRemainingSupply,
  useIsFullyMinted,
} from "@/hooks/useAssetToken";
import {
  useRevenueTokenBalance,
  useRevenueTokenFreeBalance,
  useRevenueTokenIsFrozen,
  useRevenueTokenFrozenTokens,
  useRevenueTokenPaused,
  useRevenueTokenIsAgent,
  useRevenueTokenTotalSupply,
  useRevenueTokenRemainingSupply,
} from "@/hooks/useRevenueToken";
import TokenAgentActions from "./TokenAgentActions";

export default function TokenCompliancePanel() {
  const [tokenType, setTokenType] = useState<"asset" | "revenue">("asset");
  const [tokenAddress, setTokenAddress] = useState("");
  const [lookupAddress, setLookupAddress] = useState("");
  const [activeAddress, setActiveAddress] = useState<`0x${string}` | undefined>();

  const addr = tokenAddress.match(/^0x[a-fA-F0-9]{40}$/) ? (tokenAddress as `0x${string}`) : undefined;
  const isAsset = tokenType === "asset";

  // Supply overview
  const { formatted: assetSupply } = useAssetTokenTotalSupply(isAsset ? addr : undefined);
  const { formatted: revenueSupply } = useRevenueTokenTotalSupply(!isAsset ? addr : undefined);
  const { formatted: assetRemaining } = useAssetTokenRemainingSupply(isAsset ? addr : undefined);
  const { formatted: revenueRemaining } = useRevenueTokenRemainingSupply(!isAsset ? addr : undefined);
  const { data: assetPaused } = useAssetTokenPaused(isAsset ? addr : undefined);
  const { data: revenuePaused } = useRevenueTokenPaused(!isAsset ? addr : undefined);
  const { data: fullyMinted } = useIsFullyMinted(isAsset ? addr : undefined);

  // Address lookup
  const { formatted: assetBal } = useAssetTokenBalance(isAsset ? addr : undefined, activeAddress);
  const { formatted: revenueBal } = useRevenueTokenBalance(!isAsset ? addr : undefined, activeAddress);
  const { formatted: assetFree } = useAssetTokenFreeBalance(isAsset ? addr : undefined, activeAddress);
  const { formatted: revenueFree } = useRevenueTokenFreeBalance(!isAsset ? addr : undefined, activeAddress);
  const { data: assetFrozen } = useAssetTokenIsFrozen(isAsset ? addr : undefined, activeAddress);
  const { data: revenueFrozen } = useRevenueTokenIsFrozen(!isAsset ? addr : undefined, activeAddress);
  const { formatted: assetFrozenAmt } = useAssetTokenFrozenTokens(isAsset ? addr : undefined, activeAddress);
  const { formatted: revenueFrozenAmt } = useRevenueTokenFrozenTokens(!isAsset ? addr : undefined, activeAddress);
  const { data: assetIsAgent } = useAssetTokenIsAgent(isAsset ? addr : undefined, activeAddress);
  const { data: revenueIsAgent } = useRevenueTokenIsAgent(!isAsset ? addr : undefined, activeAddress);

  const totalSupply = isAsset ? assetSupply : revenueSupply;
  const remaining = isAsset ? assetRemaining : revenueRemaining;
  const isPaused = isAsset ? assetPaused === true : revenuePaused === true;
  const balance = isAsset ? assetBal : revenueBal;
  const freeBalance = isAsset ? assetFree : revenueFree;
  const isFrozen = isAsset ? assetFrozen === true : revenueFrozen === true;
  const frozenAmount = isAsset ? assetFrozenAmt : revenueFrozenAmt;
  const isAgent = isAsset ? assetIsAgent === true : revenueIsAgent === true;

  return (
    <div className="space-y-6">
      {/* Token Selector */}
      <Card>
        <CardContent className="p-6">
          <Heading as="h3" className="mb-4">Token Compliance Panel</Heading>
          <div className="flex gap-3 mb-4">
            <Button
              variant={isAsset ? "default" : "outline"}
              onClick={() => setTokenType("asset")}
            >
              AssetToken
            </Button>
            <Button
              variant={!isAsset ? "default" : "outline"}
              onClick={() => setTokenType("revenue")}
            >
              RevenueToken
            </Button>
          </div>
          <Input
            type="text"
            label="Token Contract Address"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
          />
        </CardContent>
      </Card>

      {/* Supply Overview */}
      {addr && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading as="h4" className="text-sm">{isAsset ? "Asset" : "Revenue"} Token Overview</Heading>
              <div className="flex gap-2">
                {Boolean(isPaused) && <Badge variant="error">Paused</Badge>}
                {Boolean(fullyMinted) && isAsset && <Badge variant="success">Fully Minted</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600">Total Supply</p>
                <p className="text-lg font-bold text-blue-700">{parseFloat(totalSupply).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600">Remaining</p>
                <p className="text-lg font-bold text-purple-700">{parseFloat(remaining).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${isPaused ? "bg-red-50" : "bg-green-50"}`}>
                <p className="text-xs text-gray-600">Status</p>
                <p className={`text-lg font-bold ${isPaused ? "text-red-700" : "text-green-700"}`}>{isPaused ? "Paused" : "Active"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address Lookup */}
      {addr && (
        <Card>
          <CardContent className="p-6">
            <Heading as="h4" className="text-sm mb-3">Address Lookup</Heading>
            <div className="flex gap-3 mb-4">
              <Input
                type="text"
                value={lookupAddress}
                onChange={(e) => setLookupAddress(e.target.value)}
                placeholder="Holder address 0x..."
                className="flex-1"
              />
              <Button
                onClick={() => setActiveAddress(lookupAddress as `0x${string}`)}
                disabled={!lookupAddress.match(/^0x[a-fA-F0-9]{40}$/)}
              >
                Look Up
              </Button>
            </div>

            {activeAddress && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Balance</p>
                  <p className="text-sm font-bold">{parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Free Balance</p>
                  <p className="text-sm font-bold text-green-600">{parseFloat(freeBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Frozen</p>
                  <p className="text-sm font-bold text-red-600">{parseFloat(frozenAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Status</p>
                  <div className="flex gap-1 justify-center mt-1">
                    {isFrozen && <Badge variant="error" className="text-xs">Frozen</Badge>}
                    {isAgent && <Badge variant="info" className="text-xs">Agent</Badge>}
                    {!isFrozen && !isAgent && <Badge variant="success" className="text-xs">Normal</Badge>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agent Actions */}
      {addr && <TokenAgentActions tokenAddress={addr} tokenType={tokenType} />}
    </div>
  );
}
