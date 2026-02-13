"use client";

/**
 * Bind Wallet Button Component
 * Allows logged-in users to bind their wallet to their account
 */

import { useConnect, useAccount } from "wagmi";
import { useBindWallet } from "@/hooks/useWalletAuth";
import { useState } from "react";

interface BindWalletButtonProps {
  onSuccess?: (user: any) => void;
  className?: string;
}

export function BindWalletButton({ onSuccess, className = "" }: BindWalletButtonProps) {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { bindWallet, isLoading } = useBindWallet();
  const [showConnectors, setShowConnectors] = useState(false);

  const handleBindWallet = async () => {
    if (!isConnected) {
      setShowConnectors(true);
      return;
    }

    await bindWallet(onSuccess);
  };

  if (isConnected && address) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="text-sm text-gray-600">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button
          onClick={handleBindWallet}
          disabled={isLoading}
          className="px-4 py-2 bg-primary hover:bg-primary-dull text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Binding..." : "Bind This Wallet"}
        </button>
      </div>
    );
  }

  if (showConnectors) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <p className="text-sm text-gray-600 mb-2">Connect your wallet to bind it:</p>
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 hover:border-primary hover:bg-primary hover:text-white rounded-lg transition-all"
          >
            <span>{getConnectorIcon(connector.name)}</span>
            <span>{connector.name}</span>
          </button>
        ))}
        <button
          onClick={() => setShowConnectors(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleBindWallet}
      className={`px-4 py-2 bg-primary hover:bg-primary-dull text-white rounded-lg font-medium transition-colors ${className}`}
    >
      Connect Wallet
    </button>
  );
}

function getConnectorIcon(name: string): string {
  const icons: Record<string, string> = {
    MetaMask: "🦊",
    "MetaMask SDK": "🦊",
    WalletConnect: "🔗",
    "Coinbase Wallet": "💼",
    Injected: "🔌",
  };
  return icons[name] || "💳";
}
