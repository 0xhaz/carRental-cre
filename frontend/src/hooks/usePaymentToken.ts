/**
 * Payment Token Hooks
 * Hooks for interacting with the RegShield payment token (ERC20)
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { usePaymentToken as usePaymentTokenContract } from "./useContracts";
import { parseUnits, formatUnits } from "viem";
import { PAYMENT_TOKEN_DECIMALS } from "@/constants";

/**
 * Get payment token balance for an address
 */
export function useTokenBalance(address?: `0x${string}`) {
  const { address: tokenAddress, abi } = usePaymentTokenContract();

  const result = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    ...result,
    formatted: result.data ? formatUnits(result.data as bigint, PAYMENT_TOKEN_DECIMALS) : "0",
  };
}

/**
 * Get current user's token balance
 */
export function useMyTokenBalance() {
  const { address } = useAccount();
  return useTokenBalance(address);
}

/**
 * Get token allowance for a spender
 */
export function useTokenAllowance(owner?: `0x${string}`, spender?: `0x${string}`) {
  const { address: tokenAddress, abi } = usePaymentTokenContract();

  const result = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!(owner && spender),
    },
  });

  return {
    ...result,
    formatted: result.data ? formatUnits(result.data as bigint, PAYMENT_TOKEN_DECIMALS) : "0",
  };
}

/**
 * Approve token spending
 */
export function useApproveToken() {
  const { address: tokenAddress, abi } = usePaymentTokenContract();
  const { data: hash, writeContract, ...rest } = useWriteContract();

  const approve = (spender: `0x${string}`, amount: string) => {
    const amountWei = parseUnits(amount, PAYMENT_TOKEN_DECIMALS);
    writeContract({
      address: tokenAddress,
      abi,
      functionName: "approve",
      args: [spender, amountWei],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    approve,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

/**
 * Transfer tokens
 */
export function useTransferToken() {
  const { address: tokenAddress, abi } = usePaymentTokenContract();
  const { data: hash, writeContract, ...rest } = useWriteContract();

  const transfer = (to: `0x${string}`, amount: string) => {
    const amountWei = parseUnits(amount, PAYMENT_TOKEN_DECIMALS);
    writeContract({
      address: tokenAddress,
      abi,
      functionName: "transfer",
      args: [to, amountWei],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    transfer,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

/**
 * Get total token supply
 */
export function useTotalSupply() {
  const { address: tokenAddress, abi } = usePaymentTokenContract();

  const result = useReadContract({
    address: tokenAddress,
    abi,
    functionName: "totalSupply",
  });

  return {
    ...result,
    formatted: result.data ? formatUnits(result.data as bigint, PAYMENT_TOKEN_DECIMALS) : "0",
  };
}

/**
 * Helper to format token amount
 */
export function formatTokenAmount(amount: bigint | string): string {
  if (typeof amount === "string") {
    return amount;
  }
  return formatUnits(amount, PAYMENT_TOKEN_DECIMALS);
}

/**
 * Helper to parse token amount from user input
 */
export function parseTokenAmount(amount: string): bigint {
  return parseUnits(amount, PAYMENT_TOKEN_DECIMALS);
}
