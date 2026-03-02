"use client";

import { useState, useEffect, FormEvent } from "react";
import { Card, Button, Input, Badge } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import {
  useMyAssetTokenBalance,
  useMyAssetTokenFreeBalance,
  useMyAssetTokenIsFrozen,
  useAssetTokenTransfer,
  useAssetTokenCanTransfer,
} from "@/hooks/useAssetToken";
import {
  useMyRevenueTokenBalance,
  useMyRevenueTokenFreeBalance,
  useMyRevenueTokenIsFrozen,
  useRevenueTokenTransfer,
  useRevenueTokenCanTransfer,
} from "@/hooks/useRevenueToken";

export interface TransferTokensModalProps {
  onClose: () => void;
  tokenAddress?: `0x${string}`;
  tokenLabel?: string;
  tokenType?: "asset" | "revenue";
}

export function TransferTokensModal({
  onClose,
  tokenAddress: tokenAddressProp,
  tokenLabel,
  tokenType = "asset",
}: TransferTokensModalProps) {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [resolvedTokenAddress, setResolvedTokenAddress] = useState<`0x${string}` | undefined>(tokenAddressProp);
  const [isResolvingToken, setIsResolvingToken] = useState(!tokenAddressProp);
  const { address: walletAddress } = useAccount();

  // Self-resolve token address if not provided via props
  useEffect(() => {
    if (tokenAddressProp) {
      setResolvedTokenAddress(tokenAddressProp);
      setIsResolvingToken(false);
      return;
    }

    setIsResolvingToken(true);

    import("@/lib/api").then(({ investmentApi }) => {
      investmentApi.getPortfolio().then(async (res) => {
        if (!res.success || !res.data.investments?.length) {
          setIsResolvingToken(false);
          return;
        }

        for (const inv of res.data.investments) {
          const v = inv.vehicle as any;
          if (v && typeof v === "object" && v.assetTokenAddress) {
            setResolvedTokenAddress(v.assetTokenAddress as `0x${string}`);
            setIsResolvingToken(false);
            return;
          }
        }

        const firstVehicle = res.data.investments[0].vehicle;
        const vehicleId = typeof firstVehicle === "object" && firstVehicle !== null
          ? (firstVehicle as any)._id
          : firstVehicle;

        if (vehicleId) {
          try {
            const pitchRes = await investmentApi.getVehiclePitch(String(vehicleId));
            if (pitchRes.success && pitchRes.data.vehicle?.assetTokenAddress) {
              setResolvedTokenAddress(pitchRes.data.vehicle.assetTokenAddress as `0x${string}`);
              setIsResolvingToken(false);
              return;
            }
          } catch {}
        }

        try {
          const mkRes = await investmentApi.getMarketplace();
          if (mkRes.success && mkRes.data?.length) {
            for (const campaign of mkRes.data) {
              const cv = (campaign as any).vehicle;
              if (cv && typeof cv === "object" && cv.assetTokenAddress) {
                setResolvedTokenAddress(cv.assetTokenAddress as `0x${string}`);
                setIsResolvingToken(false);
                return;
              }
            }
          }
        } catch {}

        setIsResolvingToken(false);
      }).catch(() => setIsResolvingToken(false));
    }).catch(() => setIsResolvingToken(false));
  }, [tokenAddressProp]);

  const tokenAddress = resolvedTokenAddress;
  const isAsset = tokenType === "asset";

  // Balances via typed hooks
  const { formatted: assetBal, refetch: refetchAsset } = useMyAssetTokenBalance(isAsset ? tokenAddress : undefined);
  const { formatted: assetFree } = useMyAssetTokenFreeBalance(isAsset ? tokenAddress : undefined);
  const { data: assetFrozen } = useMyAssetTokenIsFrozen(isAsset ? tokenAddress : undefined);
  const { formatted: revenueBal, refetch: refetchRevenue } = useMyRevenueTokenBalance(!isAsset ? tokenAddress : undefined);
  const { formatted: revenueFree } = useMyRevenueTokenFreeBalance(!isAsset ? tokenAddress : undefined);
  const { data: revenueFrozen } = useMyRevenueTokenIsFrozen(!isAsset ? tokenAddress : undefined);

  const balance = parseFloat(isAsset ? assetBal : revenueBal);
  const freeBalance = parseFloat(isAsset ? assetFree : revenueFree);
  const isFrozen = isAsset ? assetFrozen === true : revenueFrozen === true;
  const symbol = tokenLabel || (isAsset ? "AST" : "REV");

  // Compliance pre-validation
  const parsedAmount = amount && parseFloat(amount) > 0 ? parseEther(amount) : undefined;
  const validRecipient = recipientAddress.match(/^0x[a-fA-F0-9]{40}$/) ? (recipientAddress as `0x${string}`) : undefined;
  const { data: assetCanTransfer } = useAssetTokenCanTransfer(
    isAsset ? tokenAddress : undefined, walletAddress, validRecipient, parsedAmount
  );
  const { data: revenueCanTransfer } = useRevenueTokenCanTransfer(
    !isAsset ? tokenAddress : undefined, walletAddress, validRecipient, parsedAmount
  );
  const canTransfer = isAsset ? assetCanTransfer : revenueCanTransfer;

  // Write hooks
  const assetTransfer = useAssetTokenTransfer(isAsset ? tokenAddress : undefined);
  const revenueTransfer = useRevenueTokenTransfer(!isAsset ? tokenAddress : undefined);
  const txHook = isAsset ? assetTransfer : revenueTransfer;
  const { transfer, hash: txHash, isConfirming, isSuccess, isPending, error: txError } = txHook;

  const isLoading = isPending || isConfirming;

  // Handle successful transfer
  useEffect(() => {
    if (isSuccess && txHash) {
      toast.success(
        `Successfully transferred ${amount} ${symbol} tokens to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`
      );
      if (tokenAddress) {
        import("@/lib/api").then(({ investmentApi }) => {
          investmentApi.recordTokenTransfer({
            tokenAddress,
            recipientAddress,
            amount,
            txHash,
          }).catch((err) => console.error("Failed to sync transfer to DB:", err));
        });
      }
      isAsset ? refetchAsset() : refetchRevenue();
      onClose();
    }
  }, [isSuccess, txHash]);

  // Handle transfer errors
  useEffect(() => {
    if (!txError) return;
    const msg = txError.message || String(txError);
    if (msg.includes("User rejected") || msg.includes("user rejected")) {
      toast.error("Transaction cancelled by user.");
    } else if (msg.includes("insufficient") || msg.includes("exceeds balance")) {
      toast.error("Insufficient token balance for this transfer.");
    } else {
      toast.error("Transfer failed. Check console for details.");
      console.error("Transfer error:", txError);
    }
  }, [txError]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!recipientAddress || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (transferAmount > freeBalance) {
      toast.error("Amount exceeds free (non-frozen) balance");
      return;
    }

    if (!validRecipient) {
      toast.error("Invalid wallet address format");
      return;
    }

    if (!tokenAddress) {
      toast.error("No token address configured.");
      return;
    }

    if (isFrozen) {
      toast.error("Your tokens are frozen. Transfer not allowed.");
      return;
    }

    transfer(validRecipient, parseEther(amount));
  };

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-8 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center mb-2">
          Transfer <span className={isAsset ? "text-blue-600" : "text-green-600"}>{symbol} Tokens</span>
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Send {isAsset ? "asset" : "revenue"} tokens to another wallet address
        </p>

        {/* Frozen Warning */}
        {isFrozen && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Badge variant="error" className="mb-1">Account Frozen</Badge>
            <p className="text-xs text-red-700">Your tokens are frozen. Transfers are disabled.</p>
          </div>
        )}

        {/* Balance Display */}
        <div className={`${isAsset ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"} border rounded-lg p-4 mb-6`}>
          <p className="text-sm text-gray-600">Available Balance</p>
          <p className={`text-2xl font-bold ${isAsset ? "text-blue-600" : "text-green-600"}`}>
            {balance.toLocaleString()} {symbol}
          </p>
          {freeBalance < balance && (
            <p className="text-xs text-gray-500 mt-1">
              Free: {freeBalance.toLocaleString()} | Frozen: {(balance - freeBalance).toLocaleString()}
            </p>
          )}
          {tokenAddress && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
            </p>
          )}
        </div>

        {isResolvingToken ? (
          <div className="text-center py-6">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Loading token data...</p>
          </div>
        ) : !tokenAddress ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-2">No token address available.</p>
            <p className="text-sm text-gray-500">
              You need an active investment with deployed tokens to transfer.
            </p>
            <Button variant="ghost" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Recipient Wallet Address"
              type="text"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              required
              disabled={isLoading || isFrozen}
            />

            {/* Compliance Check */}
            {validRecipient && parsedAmount && canTransfer !== undefined && (
              <div className={`p-2 rounded text-xs ${canTransfer ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {canTransfer ? "Compliance check passed" : "Compliance check failed — transfer may be rejected"}
              </div>
            )}

            <div>
              <Input
                label={`Amount (${symbol})`}
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isLoading || isFrozen}
                min="0"
                step="0.01"
              />
              <div className="flex gap-2 mt-2">
                {[25, 50, 75].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setAmount((freeBalance * pct / 100).toString())}
                    disabled={isLoading || isFrozen}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount(freeBalance.toString())}
                  disabled={isLoading || isFrozen}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Tx Hash */}
            {txHash && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  Tx: <code className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-8)}</code>
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading || freeBalance === 0 || isFrozen}
            >
              {isLoading ? "Processing..." : `Transfer ${symbol}`}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
