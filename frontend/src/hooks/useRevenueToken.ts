/**
 * RevenueToken Hooks
 * Read hooks for dynamically deployed RevenueToken contracts.
 * Accepts tokenAddress as a parameter (not from useContracts).
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { REVENUE_TOKEN_ABI } from "@/contracts/abis";
import { formatEther, parseGwei } from "viem";

const SEPOLIA_GAS_OVERRIDES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
};

/**
 * Get revenue info for a holder (balance, accumulated revenue, receipt time, transfer status)
 */
export function useRevenueInfo(
  tokenAddress?: `0x${string}`,
  holder?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
    functionName: "getRevenueInfo",
    args: holder ? [holder] : undefined,
    query: {
      enabled: !!tokenAddress && !!holder,
    },
  });

  const data = result.data as
    | [bigint, bigint, bigint, boolean]
    | undefined;

  return {
    ...result,
    balance: data?.[0],
    balanceFormatted: data?.[0] ? formatEther(data[0]) : "0",
    accumulated: data?.[1],
    accumulatedFormatted: data?.[1] ? formatEther(data[1]) : "0",
    receiptTime: data?.[2],
    canTransfer: data?.[3],
  };
}

/**
 * Get revenue share percentage for a holder (basis points, 10000 = 100%)
 */
export function useRevenueSharePercentage(
  tokenAddress?: `0x${string}`,
  holder?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
    functionName: "revenueSharePercentage",
    args: holder ? [holder] : undefined,
    query: {
      enabled: !!tokenAddress && !!holder,
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
 * Get total revenue distributed through this token
 */
export function useTotalRevenueDistributed(tokenAddress?: `0x${string}`) {
  const result = useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
    functionName: "totalRevenueDistributed",
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
 * Get vehicle info linked to this revenue token
 */
export function useRevenueTokenVehicleInfo(tokenAddress?: `0x${string}`) {
  const result = useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
    functionName: "getVehicleInfo",
    query: {
      enabled: !!tokenAddress,
    },
  });

  const data = result.data as
    | [string, bigint, `0x${string}`, `0x${string}`, bigint, bigint]
    | undefined;

  return {
    ...result,
    vin: data?.[0],
    tokenId: data?.[1],
    nftContract: data?.[2],
    assetToken: data?.[3],
    supplyCap: data?.[4],
    totalDistributed: data?.[5],
    totalDistributedFormatted: data?.[5] ? formatEther(data[5]) : "0",
  };
}

/**
 * Get remaining supply (tokens not yet minted)
 */
export function useRevenueTokenRemainingSupply(
  tokenAddress?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
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

/*//////////////////////////////////////////////////////////////
                    CONVENIENCE WRAPPERS
//////////////////////////////////////////////////////////////*/

/** Get current user's revenue info for a token */
export function useMyRevenueInfo(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  return useRevenueInfo(tokenAddress, userAddress);
}

/** Get current user's revenue share percentage */
export function useMyRevenueSharePercentage(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  return useRevenueSharePercentage(tokenAddress, userAddress);
}

/*//////////////////////////////////////////////////////////////
                    ERC-3643 COMPLIANCE HOOKS
//////////////////////////////////////////////////////////////*/

/**
 * Check if a transfer is allowed by compliance rules
 */
export function useRevenueTokenCanTransfer(
  tokenAddress?: `0x${string}`,
  from?: `0x${string}`,
  to?: `0x${string}`,
  amount?: bigint,
) {
  return useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
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
export function useRevenueTokenFreeBalance(
  tokenAddress?: `0x${string}`,
  userAddress?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
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
export function useRevenueTokenIsFrozen(
  tokenAddress?: `0x${string}`,
  userAddress?: `0x${string}`,
) {
  return useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
    functionName: "isFrozen",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
    },
  });
}

/** Check if current user's revenue tokens are frozen */
export function useMyRevenueTokenIsFrozen(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  return useRevenueTokenIsFrozen(tokenAddress, userAddress);
}

/** Get current user's free balance */
export function useMyRevenueTokenFreeBalance(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  return useRevenueTokenFreeBalance(tokenAddress, userAddress);
}

/*//////////////////////////////////////////////////////////////
                    ERC-20 STANDARD READS
//////////////////////////////////////////////////////////////*/

/**
 * Get revenue token balance for an address
 */
export function useRevenueTokenBalance(
  tokenAddress?: `0x${string}`,
  owner?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: !!tokenAddress && !!owner },
  });

  return {
    ...result,
    formatted: result.data ? formatEther(result.data as bigint) : "0",
  };
}

/** Get current user's revenue token balance */
export function useMyRevenueTokenBalance(tokenAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  return useRevenueTokenBalance(tokenAddress, userAddress);
}

/**
 * Get total supply of revenue token
 */
export function useRevenueTokenTotalSupply(tokenAddress?: `0x${string}`) {
  const result = useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
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
export function useRevenueTokenFrozenTokens(
  tokenAddress?: `0x${string}`,
  userAddress?: `0x${string}`,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
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
 * Check if revenue token contract is paused
 */
export function useRevenueTokenPaused(tokenAddress?: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
    functionName: "paused",
    query: { enabled: !!tokenAddress },
  });
}

/**
 * Check if an address is an agent
 */
export function useRevenueTokenIsAgent(
  tokenAddress?: `0x${string}`,
  agent?: `0x${string}`,
) {
  return useReadContract({
    address: tokenAddress,
    abi: REVENUE_TOKEN_ABI,
    functionName: "isAgent",
    args: agent ? [agent] : undefined,
    query: { enabled: !!tokenAddress && !!agent },
  });
}

/*//////////////////////////////////////////////////////////////
                    ERC-20 / ERC-3643 WRITES
//////////////////////////////////////////////////////////////*/

/**
 * Transfer revenue tokens (ERC-3643 compliant)
 */
export function useRevenueTokenTransfer(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const transfer = (to: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: REVENUE_TOKEN_ABI,
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
 * Approve spender for revenue tokens
 */
export function useRevenueTokenApprove(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const approve = (spender: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: REVENUE_TOKEN_ABI,
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
 * Mint revenue tokens (agent only)
 */
export function useRevenueTokenMint(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const mint = (to: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: REVENUE_TOKEN_ABI,
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
 * Burn revenue tokens (agent only)
 */
export function useRevenueTokenBurn(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const burn = (from: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: REVENUE_TOKEN_ABI,
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
export function useRevenueTokenSetAddressFrozen(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const setFrozen = (userAddress: `0x${string}`, frozen: boolean) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: REVENUE_TOKEN_ABI,
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
export function useRevenueTokenFreezePartial(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const freezePartial = (userAddress: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: REVENUE_TOKEN_ABI,
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
export function useRevenueTokenUnfreezePartial(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const unfreezePartial = (userAddress: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: REVENUE_TOKEN_ABI,
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
export function useRevenueTokenRecovery(tokenAddress?: `0x${string}`) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const recover = (
    lostWallet: `0x${string}`,
    newWallet: `0x${string}`,
    investorOnchainId: `0x${string}`,
  ) => {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: REVENUE_TOKEN_ABI,
      functionName: "recoveryAddress",
      args: [lostWallet, newWallet, investorOnchainId],
      gas: BigInt(500_000),
      ...SEPOLIA_GAS_OVERRIDES,
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { recover, hash, isConfirming, isSuccess, isPending, error };
}
