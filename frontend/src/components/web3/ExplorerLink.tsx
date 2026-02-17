"use client";

import { getEtherscanUrl, SEPOLIA_CHAIN_ID } from "@/constants/contracts";
import { formatAddress } from "@/lib/utils";

export interface ExplorerLinkProps {
  value: string;
  type?: "address" | "tx";
  label?: string;
  chainId?: number;
  showIcon?: boolean;
  className?: string;
}

export function ExplorerLink({
  value,
  type = "address",
  label,
  chainId = SEPOLIA_CHAIN_ID,
  showIcon = true,
  className,
}: ExplorerLinkProps) {
  const url = getEtherscanUrl(chainId, value, type);
  const displayText = label || formatAddress(value, 6, 4);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-primary hover:text-primary-dull transition-colors font-mono text-sm ${className || ""}`}
    >
      {displayText}
      {showIcon && (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </a>
  );
}
