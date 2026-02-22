/**
 * World ID Verification Hook
 * Handles World ID proof-of-personhood verification via MiniKit
 * and reads on-chain verification status from WorldIDVerifier contract
 */

import { useState, useCallback, useEffect } from "react";
import {
  MiniKit,
  type VerifyCommandInput,
  VerificationLevel,
} from "@worldcoin/minikit-js";
import { useReadContract, useAccount } from "wagmi";
import { decodeAbiParameters } from "viem";
import { useWorldIDVerifier } from "./useContracts";

const WORLD_ACTION_ID = process.env.NEXT_PUBLIC_WORLD_ACTION_ID || "verify-regshield";

export function useWorldID() {
  const { address } = useAccount();
  const { address: contractAddress, abi } = useWorldIDVerifier();

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    try { setIsMiniApp(MiniKit.isInstalled()); } catch {}
  }, []);

  // Read on-chain verification status
  const {
    data: isVerifiedOnChain,
    isLoading,
    refetch,
  } = useReadContract({
    address: contractAddress,
    abi,
    functionName: "isWorldIDVerified",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Trigger World ID verification via MiniKit
  const verifyWithWorldID = useCallback(async () => {
    try {
      if (!MiniKit.isInstalled()) {
        setVerifyError("World App not detected. Open RegShield inside World App.");
        return false;
      }
    } catch {
      setVerifyError("World App not detected. Open RegShield inside World App.");
      return false;
    }

    if (!address) {
      setVerifyError("Please connect your wallet first.");
      return false;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      // Step 1: Request World ID verification from World App
      const verifyPayload: VerifyCommandInput = {
        action: WORLD_ACTION_ID,
        signal: address,
        verification_level: VerificationLevel.Orb,
      };

      const result = await MiniKit.commandsAsync.verify(verifyPayload);

      if (result.finalPayload.status === "error") {
        setVerifyError("World ID verification was cancelled or failed.");
        return false;
      }

      // Step 2: Verify proof via backend cloud API
      const cloudRes = await fetch("/api/verify-worldid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: result.finalPayload,
          signal: address,
        }),
      });

      const cloudData = await cloudRes.json();

      if (!cloudData.success) {
        setVerifyError(cloudData.error || "Cloud verification failed.");
        return false;
      }

      // Step 3: Register on-chain via WorldIDVerifier.verifyAndRegister()
      const unpackedProof = decodeAbiParameters(
        [{ type: "uint256[8]" }],
        cloudData.proof as `0x${string}`,
      )[0];

      const txResult = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: contractAddress,
            abi: abi as readonly Record<string, unknown>[],
            functionName: "verifyAndRegister",
            args: [
              address,
              BigInt(cloudData.merkle_root),
              BigInt(cloudData.nullifier_hash),
              unpackedProof,
            ],
          },
        ],
      });

      if (txResult.finalPayload.status === "error") {
        setVerifyError("On-chain registration transaction failed.");
        return false;
      }

      // Step 4: Refetch on-chain status
      await refetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification error";
      setVerifyError(message);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [address, contractAddress, abi, refetch]);

  return {
    isMiniApp,
    isWorldIDVerified: isVerifiedOnChain === true,
    isLoading,
    isVerifying,
    verifyError,
    verifyWithWorldID,
    refetch,
  };
}
