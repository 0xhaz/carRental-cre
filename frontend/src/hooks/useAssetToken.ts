/**
 * AssetToken Hooks
 * Read hooks for dynamically deployed AssetToken contracts.
 * Accepts tokenAddress as a parameter (not from useContracts).
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ASSET_TOKEN_ABI } from "@/contracts/abis";
import { formatEther, parseGwei } from "viem";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

/**
 * Get ownership percentage for a holder (basis points, 10000 = 100%)
 */
export function useOwnershipPercentage(
  tokenAddress?: `0x${string}`,
  owner?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "ownershipPercentage",
    args: owner ? [owner] : undefined,
    query: {
      enabled: !!tokenAddress && !!owner,
    },
  });

  return {
    ...result,
    percentage: result.data as bigint | undefined,
    percentageDisplay: result.data
      ? `${Number(result.data as bigint) / 100}%`
      : "0%",
  };
}

/**
 * Get vehicle info linked to this asset token
 */
export function useAssetTokenVehicleInfo(tokenAddress?: `0x${string}`) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "getVehicleInfo",
    query: {
      enabled: !!tokenAddress,
    },
  });

  const data = result.data as
    | [string, bigint, `0x${string}`, string, boolean, bigint]
    | undefined;

  return {
    ...result,
    vin: data?.[0],
    tokenId: data?.[1],
    nftContract: data?.[2],
    metadataURI: data?.[3],
    isFractional: data?.[4],
    supplyCap: data?.[5],
  };
}

/**
 * Get remaining supply (tokens not yet minted)
 */
export function useAssetTokenRemainingSupply(
  tokenAddress?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "remainingSupply",
    query: {
      enabled: !!tokenAddress,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Check if the token's supply cap has been fully minted
 */
export function useIsFullyMinted(tokenAddress?: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "isFullyMinted",
    query: {
      enabled: !!tokenAddress,
    },
  });
}

/*//////////////////////////////////////////////////////////////
                    CONVENIENCE WRAPPERS
//////////////////////////////////////////////////////////////*/

/** Get current user's ownership percentage */
export function useMyOwnershipPercentage(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  return useOwnershipPercentage(tokenAddress, userAddress);
}

/*//////////////////////////////////////////////////////////////
                    ERC-3643 COMPLIANCE HOOKS
//////////////////////////////////////////////////////////////*/

/**
 * Check if a transfer is allowed by compliance rules
 */
export function useAssetTokenCanTransfer(
  tokenAddress?: `0x${string}`,
  from?: `0x${string}`,
  to?: `0x${string}`,
  amount?: bigint,
) {
  return useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "canTransfer",
    args: from && to && amount !== undefined ? [from, to, amount] : undefined,
    query: {
      enabled: !!tokenAddress && !!from && !!to && amount !== undefined,
    },
  });
}

/**
 * Get free (non-frozen) balance for an address
 */
export function useAssetTokenFreeBalance(
  tokenAddress?: `0x${string}`,
  userAddress?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "getFreeBalance",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Check if an address is frozen (cannot transfer)
 */
export function useAssetTokenIsFrozen(
  tokenAddress?: `0x${string}`,
  userAddress?: `0x${string}`,
) {
  return useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "isFrozen",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
    },
  });
}

/** Check if current user's asset tokens are frozen */
export function useMyAssetTokenIsFrozen(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  return useAssetTokenIsFrozen(tokenAddress, userAddress);
}

/** Get current user's free balance */
export function useMyAssetTokenFreeBalance(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  return useAssetTokenFreeBalance(tokenAddress, userAddress);
}

/*//////////////////////////////////////////////////////////////
                    ERC-20 STANDARD READS
//////////////////////////////////////////////////////////////*/

/**
 * Get asset token balance for an address
 */
export function useAssetTokenBalance(
  tokenAddress?: `0x${string}`,
  owner?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: !!tokenAddress && !!owner },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/** Get current user's asset token balance */
export function useMyAssetTokenBalance(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  return useAssetTokenBalance(tokenAddress, userAddress);
}

/**
 * Get total supply of asset token
 */
export function useAssetTokenTotalSupply(tokenAddress?: `0x${string}`) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "totalSupply",
    query: { enabled: !!tokenAddress },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Get frozen token amount for an address
 */
export function useAssetTokenFrozenTokens(
  tokenAddress?: `0x${string}`,
  userAddress?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "frozenTokens",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokenAddress && !!userAddress },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/**
 * Check if asset token contract is paused
 */
export function useAssetTokenPaused(tokenAddress?: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "paused",
    query: { enabled: !!tokenAddress },
  });
}

/**
 * Check if an address is an agent
 */
export function useAssetTokenIsAgent(
  tokenAddress?: `0x${string}`,
  agent?: `0x${string}`,
) {
  return useReadContract({
    address: tokenAddress,
    abi: ASSET_TOKEN_ABI,
    functionName: "isAgent",
    args: agent ? [agent] : undefined,
    query: { enabled: !!tokenAddress && !!agent },
  });
}

/*//////////////////////////////////////////////////////////////
                    ERC-20 / ERC-3643 WRITES
//////////////////////////////////////////////////////////////*/

/**
 * Transfer asset tokens (ERC-3643 compliant)
 */
export function useAssetTokenTransfer(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const transfer = (to: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: ASSET_TOKEN_ABI,
      functionName: "transfer",
      args: [to, amount],
      gas: BigInt(300_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { transfer, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Approve spender for asset tokens
 */
export function useAssetTokenApprove(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const approve = (spender: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: ASSET_TOKEN_ABI,
      functionName: "approve",
      args: [spender, amount],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { approve, hash, isConfirming, isSuccess, isPending, error };
}

/*//////////////////////////////////////////////////////////////
                    AGENT-ONLY WRITES
//////////////////////////////////////////////////////////////*/

/**
 * Mint asset tokens (agent only)
 */
export function useAssetTokenMint(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const mint = (to: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: ASSET_TOKEN_ABI,
      functionName: "mint",
      args: [to, amount],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { mint, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Burn asset tokens (agent only)
 */
export function useAssetTokenBurn(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const burn = (from: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: ASSET_TOKEN_ABI,
      functionName: "burn",
      args: [from, amount],
      gas: BigInt(300_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { burn, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Freeze/unfreeze an address (agent only)
 */
export function useAssetTokenSetAddressFrozen(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const setFrozen = (userAddress: `0x${string}`, frozen: boolean) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: ASSET_TOKEN_ABI,
      functionName: "setAddressFrozen",
      args: [userAddress, frozen],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { setFrozen, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Freeze partial tokens for an address (agent only)
 */
export function useAssetTokenFreezePartial(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const freezePartial = (userAddress: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: ASSET_TOKEN_ABI,
      functionName: "freePartialTokens",
      args: [userAddress, amount],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { freezePartial, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Unfreeze partial tokens for an address (agent only)
 */
export function useAssetTokenUnfreezePartial(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const unfreezePartial = (userAddress: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: ASSET_TOKEN_ABI,
      functionName: "unfreezePartialTokens",
      args: [userAddress, amount],
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { unfreezePartial, hash, isConfirming, isSuccess, isPending, error };
}

/**
 * Recover tokens from lost wallet (agent only)
 */
export function useAssetTokenRecovery(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const recover = (
    lostWallet: `0x${string}`,
    newWallet: `0x${string}`,
    investorOnchainId: `0x${string}`,
  ) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: ASSET_TOKEN_ABI,
      functionName: "recoveryAddress",
      args: [lostWallet, newWallet, investorOnchainId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { recover, hash, isConfirming, isSuccess, isPending, error };
}
