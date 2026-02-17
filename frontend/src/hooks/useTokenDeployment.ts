/**
 * Token Deployment Hooks
 * Hooks for deploying AssetToken + RevenueToken via the on-chain factories.
 */

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAssetTokenFactory, useRevenueTokenFactory } from "./useContracts";
import { parseGwei, decodeEventLog } from "viem";
import { usePublicClient } from "wagmi";
import { useState, useEffect } from "react";
import { ASSET_TOKEN_FACTORY_ABI, REVENUE_TOKEN_FACTORY_ABI } from "@/contracts/abis";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

/**
 * Deploy an AssetToken via AssetTokenFactory
 * Returns the deployed token address parsed from the AssetTokenDeployed event
 */
export function useDeployAssetToken() {
  const { address, abi } = useAssetTokenFactory();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();
  const [assetTokenAddress, setAssetTokenAddress] = useState<`0x${string}` | null>(null);

  const deploy = (name: string, symbol: string, supplyCap: bigint, vehicleVIN: string) => {
    setAssetTokenAddress(null);
    writeContract({
      address,
      abi,
      functionName: "deployAssetToken",
      args: [name, symbol, supplyCap, vehicleVIN],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  useEffect(() => {
    if (isSuccess && hash && publicClient) {
      publicClient.getTransactionReceipt({ hash }).then((receipt) => {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: ASSET_TOKEN_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "AssetTokenDeployed") {
              setAssetTokenAddress((decoded.args as unknown as { assetToken: `0x${string}` }).assetToken);
              break;
            }
          } catch {
            // Not our event, skip
          }
        }
      });
    }
  }, [isSuccess, hash, publicClient]);

  return { deploy, hash, isConfirming, isSuccess, assetTokenAddress, isPending, error };
}

/**
 * Deploy a RevenueToken via RevenueTokenFactory
 * Returns the deployed token address parsed from the RevenueTokenDeployed event
 */
export function useDeployRevenueToken() {
  const { address, abi } = useRevenueTokenFactory();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();
  const [revenueTokenAddress, setRevenueTokenAddress] = useState<`0x${string}` | null>(null);

  const deploy = (
    name: string,
    symbol: string,
    supplyCap: bigint,
    vehicleVIN: string,
    minimumHoldingPeriod: bigint,
  ) => {
    setRevenueTokenAddress(null);
    writeContract({
      address,
      abi,
      functionName: "deployRevenueToken",
      args: [name, symbol, supplyCap, vehicleVIN, minimumHoldingPeriod],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  useEffect(() => {
    if (isSuccess && hash && publicClient) {
      publicClient.getTransactionReceipt({ hash }).then((receipt) => {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: REVENUE_TOKEN_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "RevenueTokenDeployed") {
              setRevenueTokenAddress((decoded.args as unknown as { revenueToken: `0x${string}` }).revenueToken);
              break;
            }
          } catch {
            // Not our event, skip
          }
        }
      });
    }
  }, [isSuccess, hash, publicClient]);

  return { deploy, hash, isConfirming, isSuccess, revenueTokenAddress, isPending, error };
}
