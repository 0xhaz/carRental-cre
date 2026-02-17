"use client";

import { useState } from "react";
import { useContractAddresses } from "@/hooks/useContracts";
import {
  CONTRACT_NAMES,
  SEPOLIA_CHAIN_ID,
  type ContractAddresses,
} from "@/constants/contracts";
import { formatAddress, copyToClipboard } from "@/lib/utils";
import { ExplorerLink } from "./ExplorerLink";
import { Button } from "@/components/ui";
import { toast } from "react-hot-toast";

export interface ContractAddressProps {
  contractName: keyof ContractAddresses;
  showName?: boolean;
  showCopy?: boolean;
  showExplorerLink?: boolean;
  className?: string;
}

export function ContractAddress({
  contractName,
  showName = true,
  showCopy = true,
  showExplorerLink = true,
  className,
}: ContractAddressProps) {
  const contracts = useContractAddresses();
  const [isCopied, setIsCopied] = useState(false);

  const address = contracts[contractName];
  const displayName = CONTRACT_NAMES[contractName];

  const handleCopy = async () => {
    try {
      await copyToClipboard(address);
      setIsCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  return (
    <div className={className}>
      {showName && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {displayName}
        </label>
      )}
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
          {formatAddress(address, 6, 4)}
        </code>

        {showCopy && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="shrink-0"
          >
            {isCopied ? "Copied!" : "Copy"}
          </Button>
        )}

        {showExplorerLink && (
          <ExplorerLink
            value={address}
            type="address"
            label="View"
            chainId={SEPOLIA_CHAIN_ID}
            className="shrink-0"
          />
        )}
      </div>
    </div>
  );
}
