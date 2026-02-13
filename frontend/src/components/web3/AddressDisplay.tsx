"use client";

import { useState } from "react";
import { Button, Badge } from "@/components/ui";
import { formatAddress, copyToClipboard } from "@/lib/utils";
import { toast } from "react-hot-toast";

export interface AddressDisplayProps {
  address: string;
  label?: string;
  showCopy?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  startChars?: number;
  endChars?: number;
  className?: string;
}

export function AddressDisplay({
  address,
  label,
  showCopy = true,
  showBadge = false,
  badgeText = "Verified",
  startChars = 6,
  endChars = 4,
  className,
}: AddressDisplayProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(address);
      setIsCopied(true);
      toast.success("Address copied to clipboard");

      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
          {formatAddress(address, startChars, endChars)}
        </code>

        {showBadge && (
          <Badge variant="success" className="shrink-0">
            {badgeText}
          </Badge>
        )}

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
      </div>
    </div>
  );
}

export interface AddressCardProps {
  address: string;
  title: string;
  description?: string;
  verified?: boolean;
  className?: string;
}

export function AddressCard({
  address,
  title,
  description,
  verified = false,
  className,
}: AddressCardProps) {
  return (
    <div className={`rounded-lg border border-borderColor bg-white p-4 ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        {verified && (
          <Badge variant="success" className="ml-2">
            ✓ Verified
          </Badge>
        )}
      </div>
      <AddressDisplay address={address} showBadge={false} />
    </div>
  );
}
